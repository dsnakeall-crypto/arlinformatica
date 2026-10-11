<?php

namespace App\Http\Controllers;

use App\Models\ServiceOrder;
use App\Services\DocumentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function index(ServiceOrder $order)
    {
        $documents = DB::table('generated_documents')
            ->leftJoin('users', 'users.id', '=', 'generated_documents.issued_by')
            ->where('service_order_id', $order->id)
            ->select('generated_documents.id', 'generated_documents.type', 'generated_documents.revision', 'generated_documents.issued_at', 'generated_documents.path', 'users.name as issued_by_name')
            ->orderByDesc('generated_documents.issued_at')
            ->get()
            ->filter(fn ($document) => Storage::disk('local')->exists($document->path))
            ->map(function ($document) {
                unset($document->path);

                return $document;
            })
            ->values();

        return response()->json($documents);
    }

    public function term(Request $request, ServiceOrder $order, DocumentService $documents)
    {
        DB::transaction(function () use ($request, $order, $documents) {
            $locked = ServiceOrder::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();
            $existing = DB::table('generated_documents')->where(['service_order_id' => $locked->id, 'type' => 'term', 'revision' => 1])->exists();
            if (! $existing) {
                $locked->load('snapshot');
                $orderData = $locked->toArray();
                $orderData['intake_condition'] = $locked->intake_condition;
                $documents->issue($locked, 'term', ['order' => $orderData, 'snapshot' => $locked->snapshot->toArray()], $request->user()->id);
            }
        });

        return $documents->response($order, 'term');
    }

    public function budget(Request $request, ServiceOrder $order, int $revision, DocumentService $documents)
    {
        $response = $documents->response($order, 'budget', $revision);
        if ($request->boolean('download')) {
            $response->headers->set('Content-Disposition', $response->headers->makeDisposition('attachment', "Orcamento-OS-{$order->number}-R{$revision}.pdf"));
        }

        return $response;
    }

    public function finalDocument(ServiceOrder $order, int $revision, DocumentService $documents)
    {
        return $documents->response($order, 'final', $revision);
    }

    public function finalRecord(ServiceOrder $order, int $revision, DocumentService $documents)
    {
        return $documents->response($order, 'final-record', $revision);
    }

    public function technicalReport(ServiceOrder $order, int $revision, DocumentService $documents)
    {
        return $documents->response($order, 'technical-report', $revision);
    }
}
