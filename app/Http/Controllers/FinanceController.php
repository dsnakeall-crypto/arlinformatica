<?php

namespace App\Http\Controllers;

use App\Models\ServiceOrder;
use App\Services\CompanySettings;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\CarbonImmutable;
use DateTimeImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class FinanceController extends Controller
{
    private const TZ = 'America/Sao_Paulo';

    public function pay(Request $request, ServiceOrder $order): JsonResponse
    {
        $data = $request->validate([
            'amount_cents' => ['required', 'integer', 'min:1'],
            'method' => ['required', Rule::in(['pix', 'cash', 'debit', 'credit', 'transfer', 'other'])],
            'idempotency_key' => ['required', 'string', 'max:100'],
        ]);

        $existing = DB::table('payments')->where('idempotency_key', $data['idempotency_key'])->first();
        if ($existing) {
            abort_unless((int) $existing->service_order_id === $order->id, 409, 'A chave de idempotência já foi usada em outro pagamento.');

            return response()->json($existing);
        }

        $now = CarbonImmutable::now('UTC');
        $payment = DB::transaction(function () use ($data, $order, $request, $now) {
            $lockedOrder = ServiceOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            $total = $this->orderTotalCents($lockedOrder);
            if ($total <= 0) {
                throw ValidationException::withMessages(['amount_cents' => 'A OS ainda não possui valor definido para receber.']);
            }

            $paid = $this->paidCentsForOrder($lockedOrder);
            $balance = max(0, $total - $paid);
            abort_if($balance === 0, 409, 'Esta OS já está totalmente paga.');
            if ((int) $data['amount_cents'] > $balance) {
                throw ValidationException::withMessages(['amount_cents' => 'O valor recebido não pode superar o saldo restante da OS.']);
            }

            $id = DB::table('payments')->insertGetId([
                ...$data,
                'service_order_id' => $lockedOrder->id,
                'paid_at' => $now,
                'user_id' => $request->user()->id,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $transaction = DB::table('financial_transactions')->insertGetId([
                'payment_id' => $id,
                'origin' => 'service_order',
                'description' => "OS {$lockedOrder->number}",
                'amount_cents' => $data['amount_cents'],
                'occurred_at' => $now,
                'user_id' => $request->user()->id,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $this->audit($request, 'payment.created', 'payment', $id, null, [
                'transaction_id' => $transaction,
                ...$data,
                'order_total_cents' => $total,
                'previous_paid_cents' => $paid,
                'balance_after_cents' => $balance - (int) $data['amount_cents'],
            ]);

            return DB::table('payments')->find($id);
        });

        return response()->json($payment, 201);
    }

    /**
     * Compatibilidade com clientes antigos: devolve o pagamento mais recente ou false.
     * A interface nova usa payments(), que contém o resumo completo da OS.
     */
    public function payment(ServiceOrder $order): JsonResponse
    {
        $payment = $this->paymentRowsForOrder($order)->first();

        return response()->json($payment ?: false);
    }

    public function payments(ServiceOrder $order): JsonResponse
    {
        return response()->json($this->paymentSummary($order));
    }

    public function receivables(): JsonResponse
    {
        $latest = DB::table('financial_adjustments')
            ->select('transaction_id', DB::raw('MAX(id) as adjustment_id'))
            ->groupBy('transaction_id');

        $paid = DB::table('financial_transactions as ft')
            ->join('payments as p', 'p.id', '=', 'ft.payment_id')
            ->leftJoinSub($latest, 'latest_adjustment', 'latest_adjustment.transaction_id', '=', 'ft.id')
            ->leftJoin('financial_adjustments as adjustment', 'adjustment.id', '=', 'latest_adjustment.adjustment_id')
            ->where('ft.origin', 'service_order')
            ->groupBy('p.service_order_id')
            ->select('p.service_order_id', DB::raw('SUM(COALESCE(adjustment.new_cents, ft.amount_cents)) as paid_cents'));

        $rows = DB::table('service_orders')
            ->join('clients', 'clients.id', '=', 'service_orders.client_id')
            ->leftJoinSub($paid, 'paid', 'paid.service_order_id', '=', 'service_orders.id')
            ->where('service_orders.status', 'completed')
            ->where('service_orders.total_cents', '>', 0)
            ->whereRaw('COALESCE(paid.paid_cents, 0) < service_orders.total_cents')
            ->select(
                'service_orders.id',
                'service_orders.number',
                'service_orders.completed_at',
                'service_orders.total_cents',
                'clients.id as client_id',
                'clients.name as client_name',
                DB::raw('COALESCE(paid.paid_cents, 0) as paid_cents')
            )
            ->orderByDesc('service_orders.completed_at')
            ->get()
            ->map(function ($row) {
                $row->total_cents = (int) $row->total_cents;
                $row->paid_cents = (int) $row->paid_cents;
                $row->balance_cents = max(0, $row->total_cents - $row->paid_cents);
                $row->payment_status = $row->paid_cents > 0 ? 'partial' : 'unpaid';

                return $row;
            });

        return response()->json([
            'count' => $rows->count(),
            'total_balance_cents' => (int) $rows->sum('balance_cents'),
            'data' => $rows->values(),
        ]);
    }

    public function quickEntry(Request $request): JsonResponse
    {
        $data = $request->validate(['amount_cents' => ['required', 'integer', 'min:1']]);
        $now = CarbonImmutable::now('UTC');
        $id = DB::table('financial_transactions')->insertGetId([
            'origin' => 'quick_entry',
            'description' => 'Serviço rápido não cadastrado',
            'amount_cents' => $data['amount_cents'],
            'occurred_at' => $now,
            'user_id' => $request->user()->id,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $this->audit($request, 'finance.quick_entry', 'financial_transaction', $id, null, $data);

        return response()->json(DB::table('financial_transactions')->find($id), 201);
    }

    public function overview(Request $request): JsonResponse
    {
        [$start, $end] = $this->dayBounds($request->input('date'));
        $monthStart = $start->startOfMonth();
        $rows = $this->effective()->whereBetween('occurred_at', [$monthStart->utc(), $end->utc()])->get();
        $daily = $rows->groupBy(fn ($row) => CarbonImmutable::parse($row->occurred_at, 'UTC')->setTimezone(self::TZ)->format('Y-m-d'))
            ->map(fn ($day) => $day->sum('effective_cents'))->sortKeys();
        $today = (int) ($daily[$start->format('Y-m-d')] ?? 0);
        $yesterdayKey = DateTimeImmutable::createFromInterface($start)->modify('-1 day')->format('Y-m-d');
        $yesterday = (int) ($daily[$yesterdayKey] ?? 0);

        $todayPaymentIds = $rows->filter(fn ($row) => $row->origin === 'service_order'
            && CarbonImmutable::parse($row->occurred_at, 'UTC')->betweenIncluded($start->utc(), $end->utc()))
            ->pluck('payment_id')->filter()->unique()->values();
        $todayOrders = $todayPaymentIds->isEmpty() ? 0 : DB::table('payments')->whereIn('id', $todayPaymentIds->all())->distinct()->count('service_order_id');

        $monthPaymentIds = $rows->where('origin', 'service_order')->pluck('payment_id')->filter()->unique()->values();
        $monthOrders = $monthPaymentIds->isEmpty() ? 0 : DB::table('payments')->whereIn('id', $monthPaymentIds->all())->distinct()->count('service_order_id');
        $best = $daily->sortDesc();

        return response()->json([
            'timezone' => self::TZ,
            'today_cents' => $today,
            'paid_orders_today' => $todayOrders,
            'average_ticket_today_cents' => $todayOrders ? intdiv($today, $todayOrders) : 0,
            'month_total_cents' => $daily->sum(),
            'yesterday_cents' => $yesterday,
            'today_vs_yesterday_cents' => $today - $yesterday,
            'daily_average_cents' => $daily->count() ? intdiv($daily->sum(), $daily->count()) : 0,
            'best_day' => $best->isEmpty() ? null : ['date' => $best->keys()->first(), 'amount_cents' => $best->first()],
            'paid_orders_month' => $monthOrders,
            'daily' => $daily->map(fn ($amount, $date) => ['date' => $date, 'amount_cents' => $amount])->values(),
        ]);
    }

    public function transactions(Request $request): JsonResponse
    {
        [$start, $end] = $this->dayBounds($request->input('date'));
        $rows = $this->effective()->leftJoin('payments', 'payments.id', '=', 'financial_transactions.payment_id')
            ->leftJoin('service_orders', 'service_orders.id', '=', 'payments.service_order_id')
            ->leftJoin('users', 'users.id', '=', 'financial_transactions.user_id')
            ->whereBetween('occurred_at', [$start->utc(), $end->utc()])
            ->addSelect('payments.method', 'service_orders.number as order_number', 'users.name as user_name')
            ->orderByDesc('occurred_at')->get();

        return response()->json([
            'date' => $start->format('Y-m-d'),
            'timezone' => self::TZ,
            'total_cents' => $rows->sum('effective_cents'),
            'transactions' => $rows,
        ]);
    }

    public function month(Request $request): JsonResponse
    {
        $period = $request->validate(['period' => ['nullable', 'date_format:Y-m']])['period'] ?? now(self::TZ)->format('Y-m');
        $start = CarbonImmutable::createFromFormat('Y-m-d H:i:s', "$period-01 00:00:00", self::TZ);
        $end = $start->endOfMonth();
        $utcBounds = [$start->utc(), $end->utc()];

        $rows = $this->effective()
            ->leftJoin('payments', 'payments.id', '=', 'financial_transactions.payment_id')
            ->whereBetween('financial_transactions.occurred_at', $utcBounds)
            ->addSelect('payments.method', 'payments.service_order_id')
            ->orderBy('financial_transactions.occurred_at')
            ->get();

        $orders = $rows->where('origin', 'service_order');
        $orderIds = $orders->pluck('service_order_id')->filter(fn ($id) => $id !== null)->map(fn ($id) => (int) $id)->unique()->values();
        $paidOrderCount = $orderIds->count();

        $items = collect();
        $discount = 0;
        if ($orderIds->isNotEmpty()) {
            $allOrderReceipts = $this->effective()
                ->join('payments', 'payments.id', '=', 'financial_transactions.payment_id')
                ->where('financial_transactions.origin', 'service_order')
                ->whereIn('payments.service_order_id', $orderIds->all())
                ->where('financial_transactions.occurred_at', '<=', $utcBounds[1])
                ->addSelect('payments.service_order_id')
                ->get()
                ->groupBy('service_order_id');
            $ordersById = DB::table('service_orders')->whereIn('id', $orderIds->all())->get(['id', 'total_cents', 'discount_cents'])->keyBy('id');
            $allocation = $orderIds->mapWithKeys(function (int $orderId) use ($allOrderReceipts, $ordersById, $utcBounds) {
                $receipts = $allOrderReceipts->get($orderId, collect());
                $before = (int) $receipts
                    ->filter(fn ($row) => CarbonImmutable::parse($row->occurred_at, 'UTC')->lt($utcBounds[0]))
                    ->sum('effective_cents');
                $through = (int) $receipts->sum('effective_cents');
                $order = $ordersById->get($orderId);

                return [$orderId => [
                    'before_cents' => $before,
                    'through_cents' => $through,
                    'total_cents' => (int) $order->total_cents,
                ]];
            });

            $items = DB::table('service_order_items')
                ->whereIn('service_order_id', $orderIds->all())
                ->get(['service_order_id', 'description', 'quantity', 'subtotal_cents'])
                ->map(function ($item) use ($allocation) {
                    $share = $allocation->get((int) $item->service_order_id);

                    return [
                        'description' => $item->description,
                        'quantity' => $this->allocatedPart((int) $item->quantity, $share),
                        'total_cents' => $this->allocatedPart((int) $item->subtotal_cents, $share),
                    ];
                })
                ->filter(fn ($item) => $item['quantity'] > 0 || $item['total_cents'] > 0)
                ->groupBy('description')
                ->map(fn ($group, $description) => [
                    'description' => (string) $description,
                    'quantity' => (int) $group->sum('quantity'),
                    'total_cents' => (int) $group->sum('total_cents'),
                ])
                ->sortByDesc('total_cents')
                ->values();
            $discount = (int) $ordersById->sum(fn ($order) => $this->allocatedPart(
                (int) $order->discount_cents,
                $allocation->get((int) $order->id)
            ));
        }

        $daily = $rows->groupBy(fn ($row) => CarbonImmutable::parse($row->occurred_at, 'UTC')->setTimezone(self::TZ)->format('Y-m-d'))
            ->map(fn ($day) => (int) $day->sum('effective_cents'))->sortKeys();
        $methods = $orders->filter(fn ($row) => $row->method)->groupBy('method')
            ->map(fn ($method) => ['quantity' => $method->count(), 'total_cents' => (int) $method->sum('effective_cents')]);

        return response()->json([
            'period' => $period,
            'total_cents' => (int) $rows->sum('effective_cents'),
            'service_orders_cents' => (int) $orders->sum('effective_cents'),
            'quick_entries_cents' => (int) $rows->where('origin', 'quick_entry')->sum('effective_cents'),
            'paid_orders' => $paidOrderCount,
            'average_ticket_cents' => $paidOrderCount ? intdiv((int) $orders->sum('effective_cents'), $paidOrderCount) : 0,
            'discount_cents' => $discount,
            'allocation_note' => 'Itens e descontos são rateados proporcionalmente ao recebimento acumulado de cada OS; o cálculo cumulativo atribui eventuais centavos residuais à parcela final.',
            'daily' => $daily,
            'methods' => $methods,
            'transactions' => $rows->values(),
            'items' => $items,
        ]);
    }

    public function adjust(Request $request, int $transaction): JsonResponse
    {
        abort_unless($request->user()->hasRole('Master', 'Administrador'), 403, 'Apenas Master ou Administrador pode corrigir o financeiro.');
        $data = $request->validate([
            'new_cents' => ['required', 'integer', 'min:0'],
            'reason' => ['required', 'string', 'min:3', 'max:1000'],
        ]);
        $current = DB::table('financial_transactions')->find($transaction);
        abort_unless($current, 404);

        if ($current->origin === 'service_order' && $current->payment_id) {
            $payment = DB::table('payments')->find($current->payment_id);
            $order = $payment ? ServiceOrder::find($payment->service_order_id) : null;
            if ($order) {
                $total = $this->orderTotalCents($order);
                $otherPaid = $this->paidCentsForOrder($order, $transaction);
                if ($total > 0 && (int) $data['new_cents'] > max(0, $total - $otherPaid)) {
                    throw ValidationException::withMessages(['new_cents' => 'A correção não pode fazer o total recebido superar o valor da OS.']);
                }
            }
        }

        $previous = (int) (DB::table('financial_adjustments')->where('transaction_id', $transaction)->latest('id')->value('new_cents') ?? $current->amount_cents);
        $id = DB::table('financial_adjustments')->insertGetId([
            'transaction_id' => $transaction,
            'previous_cents' => $previous,
            'new_cents' => $data['new_cents'],
            'reason' => $data['reason'],
            'user_id' => $request->user()->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->audit($request, 'finance.adjusted', 'financial_transaction', $transaction, ['amount_cents' => $previous], ['amount_cents' => $data['new_cents'], 'reason' => $data['reason']]);

        return response()->json(DB::table('financial_adjustments')->find($id), 201);
    }

    public function issueReport(Request $request, CompanySettings $settings): JsonResponse
    {
        abort_unless($request->user()->hasRole('Master', 'Administrador'), 403);
        $month = $this->month($request)->getData(true);
        $snapshot = [
            'company' => $settings->snapshot(),
            'report' => $month,
            'generated_at' => now(self::TZ)->format('d/m/Y H:i:s'),
            'timezone' => self::TZ,
        ];
        $bytes = Pdf::loadView('documents.financial-report', $snapshot)->setPaper('a4')->output();
        $revision = (int) DB::table('generated_documents')->where(['type' => 'financial-report', 'period' => $month['period']])->max('revision') + 1;
        $path = "documents/finance/{$month['period']}-r$revision.pdf";
        Storage::disk('local')->put($path, $bytes);
        $id = DB::table('generated_documents')->insertGetId([
            'type' => 'financial-report',
            'period' => $month['period'],
            'revision' => $revision,
            'path' => $path,
            'sha256' => hash('sha256', $bytes),
            'snapshot' => json_encode($snapshot),
            'issued_at' => now(),
            'issued_by' => $request->user()->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['id' => $id, 'revision' => $revision, 'url' => "/api/finance/reports/$id/pdf"], 201);
    }

    public function report(Request $request, int $document)
    {
        $doc = DB::table('generated_documents')->where(['id' => $document, 'type' => 'financial-report'])->first();
        abort_unless($doc, 404);

        return Storage::disk('local')->response($doc->path, "relatorio-financeiro-{$doc->period}-R{$doc->revision}.pdf", [
            'Content-Type' => 'application/pdf',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    private function paymentSummary(ServiceOrder $order): array
    {
        $total = $this->orderTotalCents($order);
        $payments = $this->paymentRowsForOrder($order)->values();
        $paid = (int) $payments->sum('effective_cents');
        $balance = max(0, $total - $paid);
        $status = $paid <= 0 ? 'unpaid' : ($balance > 0 ? 'partial' : 'paid');

        return [
            'total_cents' => $total,
            'paid_cents' => $paid,
            'balance_cents' => $balance,
            'status' => $status,
            'payments' => $payments,
        ];
    }

    private function paymentRowsForOrder(ServiceOrder $order)
    {
        $latest = DB::table('financial_adjustments')
            ->select('transaction_id', DB::raw('MAX(id) as adjustment_id'))
            ->groupBy('transaction_id');

        return DB::table('payments')
            ->join('financial_transactions as ft', 'ft.payment_id', '=', 'payments.id')
            ->leftJoinSub($latest, 'latest_adjustment', 'latest_adjustment.transaction_id', '=', 'ft.id')
            ->leftJoin('financial_adjustments as adjustment', 'adjustment.id', '=', 'latest_adjustment.adjustment_id')
            ->leftJoin('users', 'users.id', '=', 'payments.user_id')
            ->where('payments.service_order_id', $order->id)
            ->select(
                'payments.*',
                'users.name as user_name',
                'ft.id as transaction_id',
                DB::raw('COALESCE(adjustment.new_cents, ft.amount_cents) as effective_cents')
            )
            ->orderByDesc('payments.paid_at')
            ->orderByDesc('payments.id')
            ->get()
            ->map(function ($payment) {
                $payment->amount_cents = (int) $payment->amount_cents;
                $payment->effective_cents = (int) $payment->effective_cents;

                return $payment;
            });
    }

    private function orderTotalCents(ServiceOrder $order): int
    {
        $total = (int) ($order->total_cents ?? 0);
        if ($total > 0) {
            return $total;
        }

        $approvedBudget = (int) (DB::table('budgets')
            ->where('service_order_id', $order->id)
            ->where('status', 'approved')
            ->orderByDesc('revision')
            ->value('total_cents') ?? 0);
        if ($approvedBudget > 0) {
            return $approvedBudget;
        }

        return (int) DB::table('service_order_items')->where('service_order_id', $order->id)->sum('subtotal_cents');
    }

    private function paidCentsForOrder(ServiceOrder $order, ?int $excludeTransactionId = null): int
    {
        $latest = DB::table('financial_adjustments')
            ->select('transaction_id', DB::raw('MAX(id) as adjustment_id'))
            ->groupBy('transaction_id');

        $query = DB::table('financial_transactions as ft')
            ->join('payments as p', 'p.id', '=', 'ft.payment_id')
            ->leftJoinSub($latest, 'latest_adjustment', 'latest_adjustment.transaction_id', '=', 'ft.id')
            ->leftJoin('financial_adjustments as adjustment', 'adjustment.id', '=', 'latest_adjustment.adjustment_id')
            ->where('p.service_order_id', $order->id)
            ->where('ft.origin', 'service_order');

        if ($excludeTransactionId !== null) {
            $query->where('ft.id', '<>', $excludeTransactionId);
        }

        return (int) ($query->selectRaw('COALESCE(SUM(COALESCE(adjustment.new_cents, ft.amount_cents)), 0) as paid_cents')->value('paid_cents') ?? 0);
    }

    private function effective()
    {
        $latest = DB::table('financial_adjustments')->select('transaction_id', DB::raw('MAX(id) as adjustment_id'))->groupBy('transaction_id');

        return DB::table('financial_transactions')
            ->leftJoinSub($latest, 'latest_adjustment', 'latest_adjustment.transaction_id', '=', 'financial_transactions.id')
            ->leftJoin('financial_adjustments as adjustment', 'adjustment.id', '=', 'latest_adjustment.adjustment_id')
            ->select('financial_transactions.*', DB::raw('COALESCE(adjustment.new_cents, financial_transactions.amount_cents) as effective_cents'));
    }

    /** @param array{before_cents: int, through_cents: int, total_cents: int} $share */
    private function allocatedPart(int $value, array $share): int
    {
        if ($value <= 0 || $share['total_cents'] <= 0) {
            return 0;
        }

        $total = $share['total_cents'];
        $before = min($total, max(0, $share['before_cents']));
        $through = min($total, max($before, $share['through_cents']));

        return intdiv($value * $through, $total) - intdiv($value * $before, $total);
    }

    private function dayBounds(?string $date): array
    {
        $day = $date ? CarbonImmutable::createFromFormat('Y-m-d', $date, self::TZ) : CarbonImmutable::now(self::TZ);

        return [$day->startOfDay(), $day->endOfDay()];
    }

    private function audit(Request $request, string $action, string $type, int $id, ?array $before, array $after): void
    {
        DB::table('audit_logs')->insert([
            'user_id' => $request->user()->id,
            'action' => $action,
            'subject_type' => $type,
            'subject_id' => $id,
            'before' => $before ? json_encode($before) : null,
            'after' => json_encode($after),
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);
    }
}
