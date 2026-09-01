<?php

namespace App\Http\Controllers;

use App\Models\ServiceOrder;
use App\Services\DocumentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DocumentController extends Controller
{
    public function term(Request $request, ServiceOrder $order, DocumentService $documents)
    {
        $existing = DB::table('generated_documents')->where(['service_order_id' => $order->id, 'type' => 'term', 'revision' => 1])->exists();
        if (! $existing) {
            $order->load(['snapshot', 'checklists']);
            $documents->issue($order, 'term', ['order' => $order->toArray(), 'snapshot' => $order->snapshot->toArray(), 'checklist' => $order->checklists->pluck('label')->all()], $request->user()->id);
        }

        return $documents->response($order, 'term');
    }

    public function budget(ServiceOrder $order, int $revision, DocumentService $documents)
    {
        return $documents->response($order, 'budget', $revision);
    }
}
