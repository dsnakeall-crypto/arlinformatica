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

class FinanceController extends Controller
{
    private const TZ = 'America/Sao_Paulo';

    public function pay(Request $request, ServiceOrder $order): JsonResponse
    {
        $data = $request->validate(['amount_cents' => ['required', 'integer', 'min:1'], 'method' => ['required', Rule::in(['pix', 'cash', 'debit', 'credit', 'transfer', 'other'])], 'idempotency_key' => ['required', 'string', 'max:100']]);
        abort_if(DB::table('payments')->where('service_order_id', $order->id)->exists(), 409, 'Esta OS já possui pagamento registrado.');
        $now = CarbonImmutable::now('UTC');
        $payment = DB::transaction(function () use ($data, $order, $request, $now) {
            $id = DB::table('payments')->insertGetId([...$data, 'service_order_id' => $order->id, 'paid_at' => $now, 'user_id' => $request->user()->id, 'created_at' => $now, 'updated_at' => $now]);
            $transaction = DB::table('financial_transactions')->insertGetId(['payment_id' => $id, 'origin' => 'service_order', 'description' => "OS {$order->number}", 'amount_cents' => $data['amount_cents'], 'occurred_at' => $now, 'user_id' => $request->user()->id, 'created_at' => $now, 'updated_at' => $now]);
            $this->audit($request, 'payment.created', 'payment', $id, null, ['transaction_id' => $transaction, ...$data]);

            return DB::table('payments')->find($id);
        });

        return response()->json($payment, 201);
    }

    public function payment(ServiceOrder $order): JsonResponse
    {
        $payment = DB::table('payments')->leftJoin('users', 'users.id', '=', 'payments.user_id')->where('service_order_id', $order->id)->select('payments.*', 'users.name as user_name')->first();

        return response()->json($payment ?: false);
    }

    public function quickEntry(Request $request): JsonResponse
    {
        $data = $request->validate(['amount_cents' => ['required', 'integer', 'min:1']]);
        $now = CarbonImmutable::now('UTC');
        $id = DB::table('financial_transactions')->insertGetId(['origin' => 'quick_entry', 'description' => 'Serviço rápido não cadastrado', 'amount_cents' => $data['amount_cents'], 'occurred_at' => $now, 'user_id' => $request->user()->id, 'created_at' => $now, 'updated_at' => $now]);
        $this->audit($request, 'finance.quick_entry', 'financial_transaction', $id, null, $data);

        return response()->json(DB::table('financial_transactions')->find($id), 201);
    }

    public function overview(Request $request): JsonResponse
    {
        [$start, $end] = $this->dayBounds($request->input('date'));
        $monthStart = $start->startOfMonth();
        $rows = $this->effective()->whereBetween('occurred_at', [$monthStart->utc(), $end->utc()])->get();
        $daily = $rows->groupBy(fn ($row) => CarbonImmutable::parse($row->occurred_at, 'UTC')->setTimezone(self::TZ)->format('Y-m-d'))->map(fn ($day) => $day->sum('effective_cents'))->sortKeys();
        $today = (int) ($daily[$start->format('Y-m-d')] ?? 0);
        $yesterdayKey = DateTimeImmutable::createFromInterface($start)->modify('-1 day')->format('Y-m-d');
        $yesterday = (int) ($daily[$yesterdayKey] ?? 0);
        $todayOrders = $rows->filter(fn ($row) => $row->origin === 'service_order' && CarbonImmutable::parse($row->occurred_at, 'UTC')->betweenIncluded($start->utc(), $end->utc()))->count();
        $best = $daily->sortDesc();

        return response()->json(['timezone' => self::TZ, 'today_cents' => $today, 'paid_orders_today' => $todayOrders, 'average_ticket_today_cents' => $todayOrders ? intdiv($today, $todayOrders) : 0, 'month_total_cents' => $daily->sum(), 'yesterday_cents' => $yesterday, 'today_vs_yesterday_cents' => $today - $yesterday, 'daily_average_cents' => $daily->count() ? intdiv($daily->sum(), $daily->count()) : 0, 'best_day' => $best->isEmpty() ? null : ['date' => $best->keys()->first(), 'amount_cents' => $best->first()], 'paid_orders_month' => $rows->where('origin', 'service_order')->count(), 'daily' => $daily->map(fn ($amount, $date) => ['date' => $date, 'amount_cents' => $amount])->values()]);
    }

    public function transactions(Request $request): JsonResponse
    {
        [$start, $end] = $this->dayBounds($request->input('date'));
        $rows = $this->effective()->leftJoin('payments', 'payments.id', '=', 'financial_transactions.payment_id')->leftJoin('service_orders', 'service_orders.id', '=', 'payments.service_order_id')->leftJoin('users', 'users.id', '=', 'financial_transactions.user_id')->whereBetween('occurred_at', [$start->utc(), $end->utc()])->addSelect('payments.method', 'service_orders.number as order_number', 'users.name as user_name')->orderByDesc('occurred_at')->get();

        return response()->json(['date' => $start->format('Y-m-d'), 'timezone' => self::TZ, 'total_cents' => $rows->sum('effective_cents'), 'transactions' => $rows]);
    }

    public function month(Request $request): JsonResponse
    {
        $period = $request->validate(['period' => ['nullable', 'date_format:Y-m']])['period'] ?? now(self::TZ)->format('Y-m');
        $start = CarbonImmutable::createFromFormat('Y-m-d H:i:s', "$period-01 00:00:00", self::TZ);
        $rows = $this->effective()->leftJoin('payments', 'payments.id', '=', 'financial_transactions.payment_id')->leftJoin('service_orders', 'service_orders.id', '=', 'payments.service_order_id')->whereBetween('occurred_at', [$start->utc(), $start->endOfMonth()->utc()])->addSelect('payments.method', 'payments.service_order_id')->get();
        $orders = $rows->where('origin', 'service_order');
        $orderIds = $orders->pluck('service_order_id')->filter();
        $items = DB::table('service_order_items')->whereIn('service_order_id', $orderIds)->select('description', DB::raw('SUM(quantity) as quantity'), DB::raw('SUM(subtotal_cents) as total_cents'))->groupBy('description')->get();
        $discount = DB::table('service_orders')->whereIn('id', $orderIds)->sum('discount_cents');

        return response()->json(['period' => $period, 'total_cents' => $rows->sum('effective_cents'), 'service_orders_cents' => $orders->sum('effective_cents'), 'quick_entries_cents' => $rows->where('origin', 'quick_entry')->sum('effective_cents'), 'paid_orders' => $orders->count(), 'average_ticket_cents' => $orders->count() ? intdiv($orders->sum('effective_cents'), $orders->count()) : 0, 'discount_cents' => $discount, 'daily' => $rows->groupBy(fn ($row) => CarbonImmutable::parse($row->occurred_at, 'UTC')->setTimezone(self::TZ)->format('Y-m-d'))->map(fn ($day) => $day->sum('effective_cents'))->sortKeys(), 'methods' => $orders->groupBy('method')->map(fn ($method) => ['quantity' => $method->count(), 'total_cents' => $method->sum('effective_cents')]), 'transactions' => $rows->sortBy('occurred_at')->values(), 'items' => $items]);
    }

    public function adjust(Request $request, int $transaction): JsonResponse
    {
        abort_unless($request->user()->hasRole('Master', 'Administrador'), 403, 'Apenas Master ou Administrador pode corrigir o financeiro.');
        $data = $request->validate(['new_cents' => ['required', 'integer', 'min:0'], 'reason' => ['required', 'string', 'min:3', 'max:1000']]);
        $current = DB::table('financial_transactions')->find($transaction);
        abort_unless($current, 404);
        $previous = (int) (DB::table('financial_adjustments')->where('transaction_id', $transaction)->latest('id')->value('new_cents') ?? $current->amount_cents);
        $id = DB::table('financial_adjustments')->insertGetId(['transaction_id' => $transaction, 'previous_cents' => $previous, 'new_cents' => $data['new_cents'], 'reason' => $data['reason'], 'user_id' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
        $this->audit($request, 'finance.adjusted', 'financial_transaction', $transaction, ['amount_cents' => $previous], ['amount_cents' => $data['new_cents'], 'reason' => $data['reason']]);

        return response()->json(DB::table('financial_adjustments')->find($id), 201);
    }

    public function issueReport(Request $request, CompanySettings $settings): JsonResponse
    {
        abort_unless($request->user()->hasRole('Master', 'Administrador'), 403);
        $month = $this->month($request)->getData(true);
        $snapshot = ['company' => $settings->snapshot(), 'report' => $month, 'generated_at' => now(self::TZ)->format('d/m/Y H:i:s'), 'timezone' => self::TZ];
        $bytes = Pdf::loadView('documents.financial-report', $snapshot)->setPaper('a4')->output();
        $revision = (int) DB::table('generated_documents')->where(['type' => 'financial-report', 'period' => $month['period']])->max('revision') + 1;
        $path = "documents/finance/{$month['period']}-r$revision.pdf";
        Storage::disk('local')->put($path, $bytes);
        $id = DB::table('generated_documents')->insertGetId(['type' => 'financial-report', 'period' => $month['period'], 'revision' => $revision, 'path' => $path, 'sha256' => hash('sha256', $bytes), 'snapshot' => json_encode($snapshot), 'issued_at' => now(), 'issued_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(['id' => $id, 'revision' => $revision, 'url' => "/api/finance/reports/$id/pdf"], 201);
    }

    public function report(Request $request, int $document)
    {
        $doc = DB::table('generated_documents')->where(['id' => $document, 'type' => 'financial-report'])->first();
        abort_unless($doc, 404);

        return Storage::disk('local')->response($doc->path, "relatorio-financeiro-{$doc->period}-R{$doc->revision}.pdf", ['Content-Type' => 'application/pdf', 'Cache-Control' => 'private, no-store']);
    }

    private function effective()
    {
        $latest = DB::table('financial_adjustments')->select('transaction_id', DB::raw('MAX(id) as adjustment_id'))->groupBy('transaction_id');

        return DB::table('financial_transactions')->leftJoinSub($latest, 'latest_adjustment', 'latest_adjustment.transaction_id', '=', 'financial_transactions.id')->leftJoin('financial_adjustments as adjustment', 'adjustment.id', '=', 'latest_adjustment.adjustment_id')->select('financial_transactions.*', DB::raw('COALESCE(adjustment.new_cents, financial_transactions.amount_cents) as effective_cents'));
    }

    private function dayBounds(?string $date): array
    {
        $day = $date ? CarbonImmutable::createFromFormat('Y-m-d', $date, self::TZ) : CarbonImmutable::now(self::TZ);

        return [$day->startOfDay(), $day->endOfDay()];
    }

    private function audit(Request $request, string $action, string $type, int $id, ?array $before, array $after): void
    {
        DB::table('audit_logs')->insert(['user_id' => $request->user()->id, 'action' => $action, 'subject_type' => $type, 'subject_id' => $id, 'before' => $before ? json_encode($before) : null, 'after' => json_encode($after), 'ip_address' => $request->ip(), 'created_at' => now()]);
    }
}