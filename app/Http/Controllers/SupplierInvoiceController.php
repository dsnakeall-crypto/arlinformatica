<?php

namespace App\Http\Controllers;

use App\Services\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class SupplierInvoiceController extends Controller
{
    public function store(Request $request, int $id)
    {
        $data = $request->validate(['request_key' => 'required|uuid', 'invoice' => 'required|file|mimes:pdf,jpg,jpeg,png,webp|max:10240']);
        $file = $request->file('invoice');
        $actualMime = (new \finfo(FILEINFO_MIME_TYPE))->file($file->getRealPath());
        $isPdf = $actualMime === 'application/pdf' && str_starts_with(file_get_contents($file->getRealPath(), false, null, 0, 8), '%PDF-');
        $isImage = in_array($actualMime, ['image/jpeg', 'image/png', 'image/webp'], true) && @getimagesize($file->getRealPath()) !== false;
        if (! $isPdf && ! $isImage) {
            throw ValidationException::withMessages(['invoice' => 'Envie um PDF ou imagem válida; a extensão do arquivo não basta.']);
        }
        $hash = hash_file('sha256', $file->getRealPath());
        $path = null;
        try {
            return DB::transaction(function () use ($request, $id, $data, $file, $hash, $actualMime, &$path) {
                abort_unless(DB::table('supplier_purchases')->where('id', $id)->lockForUpdate()->first(), 404);
                $previous = DB::table('supplier_invoices')->where('request_key', $data['request_key'])->first();
                if ($previous) {
                    abort_unless((int) $previous->purchase_id === $id && hash_equals($previous->sha256, $hash), 409, 'Esta solicitação já anexou outra nota.');

                    return response()->json(['id' => $previous->id], 201);
                }
                abort_if(DB::table('supplier_invoices')->where('purchase_id', $id)->count() >= 20, 422, 'Limite de 20 anexos por compra.');
                $path = $file->store('supplier-invoices/'.$id, 'local');
                abort_unless($path, 500, 'Não foi possível armazenar a nota.');
                $invoice = DB::table('supplier_invoices')->insertGetId(['purchase_id' => $id, 'user_id' => $request->user()->id, 'request_key' => $data['request_key'], 'path' => $path, 'original_name' => mb_substr(basename(str_replace('\\', '/', $file->getClientOriginalName())), 0, 240), 'mime' => $actualMime, 'bytes' => $file->getSize(), 'sha256' => $hash, 'created_at' => now(), 'updated_at' => now()]);
                app(Audit::class)->record($request, 'supplier.invoice_attached', 'supplier_invoices', $invoice, null, ['purchase_id' => $id, 'sha256' => $hash]);

                return response()->json(['id' => $invoice], 201);
            });
        } catch (\Throwable $e) {
            if ($path) {
                Storage::disk('local')->delete($path);
            }
            throw $e;
        }
    }

    public function download(int $invoice)
    {
        $row = DB::table('supplier_invoices')->find($invoice);
        abort_unless($row && Storage::disk('local')->exists($row->path), 404);

        return Storage::disk('local')->download($row->path, $row->original_name, ['Content-Type' => $row->mime, 'X-Content-Type-Options' => 'nosniff']);
    }
}
