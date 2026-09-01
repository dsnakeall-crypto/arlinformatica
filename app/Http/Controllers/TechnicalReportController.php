<?php

namespace App\Http\Controllers;

use App\Models\ServiceOrder;
use App\Services\CompanySettings;
use App\Services\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TechnicalReportController extends Controller
{
    public function index(ServiceOrder $order): JsonResponse
    {
        return response()->json(DB::table('technical_reports')->leftJoin('technical_report_templates', 'technical_report_templates.id', '=', 'technical_reports.template_id')->where('service_order_id', $order->id)->select('technical_reports.*', 'technical_report_templates.name as template_name', 'technical_report_templates.kind')->orderByDesc('revision')->get());
    }

    public function store(Request $request, ServiceOrder $order): JsonResponse
    {
        $data = $this->validated($request);
        $template = DB::table('technical_report_templates')->where('id', $data['template_id'])->where('active', true)->first();
        abort_unless($template, 422, 'Selecione um modelo ativo.');
        $revision = ((int) DB::table('technical_reports')->where('service_order_id', $order->id)->max('revision')) + 1;
        $id = DB::table('technical_reports')->insertGetId(['service_order_id' => $order->id, 'template_id' => $template->id, 'revision' => $revision, 'status' => 'draft', 'content' => json_encode($data['content']), 'created_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('technical_report_templates')->where('id', $template->id)->update(['used' => true]);

        return response()->json(DB::table('technical_reports')->find($id), 201);
    }

    public function update(Request $request, ServiceOrder $order, int $revision): JsonResponse
    {
        $report = $this->find($order, $revision);
        abort_if($report->status === 'issued', 409, 'Uma revisão emitida não pode ser alterada. Crie uma nova revisão.');
        $data = $this->validated($request);
        DB::table('technical_reports')->where('id', $report->id)->update(['template_id' => $data['template_id'], 'content' => json_encode($data['content']), 'updated_at' => now()]);

        return response()->json(DB::table('technical_reports')->find($report->id));
    }

    public function issue(Request $request, ServiceOrder $order, int $revision, CompanySettings $settings, DocumentService $documents): JsonResponse
    {
        $report = $this->find($order, $revision);
        abort_if($report->status === 'issued', 409, 'Esta revisão já foi emitida e permanece imutável.');
        $content = json_decode($report->content, true);
        $template = DB::table('technical_report_templates')->find($report->template_id);
        if ($template->kind === 'electrical') {
            validator($content, ['electrical_conclusion' => 'required|in:compatible,not_evidenced,inconclusive', 'equipment_situation' => 'required|in:repairable,irreparable,repaired,awaiting_repair'])->validate();
        }
        validator($content, ['technical_analysis' => 'required|string', 'diagnosis' => 'required|string', 'conclusion' => 'required|string', 'responsible_technician' => 'required|string', 'confirmed' => 'accepted'])->validate();
        $order->load(['client', 'snapshot']);
        $photoIds = $content['photo_ids'] ?? [];
        $photos = $order->photos()->whereIn('id', $photoIds)->get()->map(fn ($photo) => ['mime' => $photo->mime, 'data' => base64_encode(Storage::disk($photo->disk)->get($photo->path))])->all();
        $snapshot = ['company' => $settings->snapshot(), 'order' => $order->toArray(), 'template' => (array) $template, 'content' => $content, 'photos' => $photos];
        DB::transaction(function () use ($report, $snapshot, $request, $order) {
            DB::table('technical_reports')->where('id', $report->id)->update(['status' => 'issued', 'snapshot' => json_encode($snapshot), 'issued_at' => now(), 'issued_by' => $request->user()->id, 'updated_at' => now()]);
            DB::table('audit_logs')->insert(['user_id' => $request->user()->id, 'action' => 'technical_report.issued', 'subject_type' => 'technical_report', 'subject_id' => $report->id, 'after' => json_encode(['revision' => $report->revision]), 'ip_address' => $request->ip(), 'created_at' => now()]);
        });
        $documents->issue($order, 'technical-report', $snapshot, $request->user()->id, $revision);

        return response()->json(DB::table('technical_reports')->find($report->id));
    }

    private function validated(Request $request): array
    {
        return $request->validate(['template_id' => 'required|exists:technical_report_templates,id', 'content' => 'required|array', 'content.customer_report' => 'nullable|string|max:10000', 'content.technical_analysis' => 'nullable|string|max:20000', 'content.tests_performed' => 'nullable|string|max:20000', 'content.components' => 'nullable|string|max:10000', 'content.diagnosis' => 'nullable|string|max:20000', 'content.conclusion' => 'nullable|string|max:20000', 'content.equipment_situation' => 'nullable|string|max:100', 'content.estimated_value_cents' => 'nullable|integer|min:0', 'content.observations' => 'nullable|string|max:10000', 'content.responsible_technician' => 'nullable|string|max:255', 'content.qualification' => 'nullable|string|max:255', 'content.certification' => 'nullable|string|max:255', 'content.event_date' => 'nullable|date', 'content.electrical_conclusion' => 'nullable|in:compatible,not_evidenced,inconclusive', 'content.photo_ids' => 'array', 'content.photo_ids.*' => 'integer', 'content.confirmed' => 'boolean']);
    }

    private function find(ServiceOrder $order, int $revision): object
    {
        $report = DB::table('technical_reports')->where(['service_order_id' => $order->id, 'revision' => $revision])->first();
        abort_unless($report, 404);

        return $report;
    }
}
