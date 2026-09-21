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
        $existing = DB::table('generated_documents')->where(['service_order_id' => $order->id, 'type' => 'term', 'revision' => 1])->exists();
        if (! $existing) {
            $order->load('snapshot');
            $orderData = $order->toArray();
            $orderData['intake_condition'] = $order->intake_condition;
            $documents->issue($order, 'term', ['order' => $orderData, 'snapshot' => $order->snapshot->toArray()], $request->user()->id);
        }

        return $documents->response($order, 'term');
    }

    public function budget(ServiceOrder $order, int $revision, DocumentService $documents)
    {
        return $documents->response($order, 'budget', $revision);
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
