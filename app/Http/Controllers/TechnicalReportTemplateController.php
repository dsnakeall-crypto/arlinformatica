<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TechnicalReportTemplateController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(DB::table('technical_report_templates')->orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $this->admin($request);
        $data = $request->validate(['name' => 'required|string|max:150', 'kind' => 'required|in:general,electrical', 'body' => 'required|string|max:20000']);
        $id = DB::table('technical_report_templates')->insertGetId([...$data, 'active' => true, 'used' => false, 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(DB::table('technical_report_templates')->find($id), 201);
    }

    public function update(Request $request, int $template): JsonResponse
    {
        $this->admin($request);
        $data = $request->validate(['name' => 'sometimes|required|string|max:150', 'kind' => 'sometimes|required|in:general,electrical', 'body' => 'sometimes|required|string|max:20000', 'active' => 'sometimes|boolean']);
        abort_unless(DB::table('technical_report_templates')->where('id', $template)->exists(), 404);
        DB::table('technical_report_templates')->where('id', $template)->update([...$data, 'updated_at' => now()]);

        return response()->json(DB::table('technical_report_templates')->find($template));
    }

    public function duplicate(Request $request, int $template): JsonResponse
    {
        $this->admin($request);
        $source = DB::table('technical_report_templates')->find($template);
        abort_unless($source, 404);
        $id = DB::table('technical_report_templates')->insertGetId(['name' => $source->name.' (cópia)', 'kind' => $source->kind, 'body' => $source->body, 'active' => true, 'used' => false, 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(DB::table('technical_report_templates')->find($id), 201);
    }

    private function admin(Request $request): void
    {
        abort_unless(in_array($request->user()->role->name, ['Master', 'Administrador']), 403);
    }
}
