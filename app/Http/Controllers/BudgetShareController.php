<?php

namespace App\Http\Controllers;

use App\Models\ServiceOrder;
use App\Services\Audit;
use App\Services\CompanySettings;
use App\Services\ContactLinks;
use App\Services\DocumentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class BudgetShareController extends Controller
{
    public function store(Request $request, ServiceOrder $order, int $revision, Audit $audit)
    {
        $budget = DB::table('budgets')->where(['service_order_id' => $order->id, 'revision' => $revision])->whereNull('deleted_at')->first();
        abort_unless($budget, 404);
        $document = DB::table('generated_documents')->where(['service_order_id' => $order->id, 'type' => 'budget', 'revision' => $revision])->first();
        abort_unless($document && Storage::disk('local')->exists($document->path), 404, 'O PDF deste orçamento não está disponível.');
        $order->load('client');
        $phone = preg_replace('/\D/', '', (string) $order->client->phone);
        abort_unless(preg_match('/^(?:\d{10,11}|55\d{10,11})$/', $phone), 422, 'Atualize o telefone do cliente antes de enviar pelo WhatsApp.');

        $token = bin2hex(random_bytes(32));
        $expiresAt = now()->addDays(30);
        DB::table('budget_share_tokens')->insert([
            'budget_id' => $budget->id,
            'generated_document_id' => $document->id,
            'token_hash' => hash('sha256', $token),
            'expires_at' => $expiresAt,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $url = route('orders.budget.public', ['token' => $token]);
        $message = "Olá, {$order->client->name}. Tudo bem?\n\nGostariamos de informar que o seu orçamento já está disponível. Você pode visualizá-lo através do seguinte link:\n\n{$url}\n\nAssim que analisar as condições, por favor, entre em contato conosco por este WhatsApp para confirmar o agendamento/execução do serviço ou esclarecer qualquer dúvida.\n\nAgradecemos a preferência e aguardamos o seu retorno.\n\nAtenciosamente\n*Arl Informática*";
        $audit->record($request, 'budget.link_created', 'budget', $budget->id, null, ['revision' => $revision, 'expires_at' => $expiresAt->toIso8601String()]);

        return response()->json(['url' => $url, 'whatsapp_url' => ContactLinks::whatsapp($phone, $message), 'expires_at' => $expiresAt->toIso8601String(), 'revision' => $revision])->header('Cache-Control', 'no-store, private');
    }

    public function download(string $token, DocumentService $documents, CompanySettings $settings)
    {
        $share = DB::table('budget_share_tokens')->where('token_hash', hash('sha256', $token))->first();
        if (! $share) {
            return $this->unavailable($settings, 'Este link não está mais disponível.', 404);
        }
        $budget = DB::table('budgets')->where('id', $share->budget_id)->whereNull('deleted_at')->first();
        $document = DB::table('generated_documents')->where('id', $share->generated_document_id)->where('type', 'budget')->first();
        if (! $budget || ! $document || (int) $document->service_order_id !== (int) $budget->service_order_id || (int) $document->revision !== (int) $budget->revision || ! Storage::disk('local')->exists($document->path)) {
            return $this->unavailable($settings, 'Este link não está mais disponível.', 410);
        }
        if (now()->greaterThanOrEqualTo($share->expires_at)) {
            return $this->unavailable($settings, 'Este link de acesso expirou.', 410);
        }
        $order = ServiceOrder::find($budget->service_order_id);
        if (! $order) {
            return $this->unavailable($settings, 'Este link não está mais disponível.', 410);
        }
        DB::table('budget_share_tokens')->where('id', $share->id)->update(['last_access_at' => now(), 'access_count' => DB::raw('access_count + 1'), 'updated_at' => now()]);
        $response = $documents->response($order, 'budget', (int) $budget->revision);
        $response->headers->set('Cache-Control', 'private, no-store');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('X-Robots-Tag', 'noindex, nofollow, noarchive');
        $response->headers->set('Referrer-Policy', 'no-referrer');

        return $response;
    }

    private function unavailable(CompanySettings $settings, string $title, int $status)
    {
        return response()->view('shares.unavailable', ['title' => $title, 'company' => $settings->all()], $status, ['Cache-Control' => 'no-store, private', 'Pragma' => 'no-cache', 'X-Robots-Tag' => 'noindex, nofollow, noarchive', 'Referrer-Policy' => 'no-referrer']);
    }
}
