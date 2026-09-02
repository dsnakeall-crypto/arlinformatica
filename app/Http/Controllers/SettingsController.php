<?php

namespace App\Http\Controllers;

use App\Services\CompanySettings;
use App\Services\LogoProcessor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class SettingsController extends Controller
{
    public function operational(CompanySettings $settings): JsonResponse
    {
        $all = $settings->all();

        return response()->json(['budget_validity_days' => (int) $all['budget_validity_days']]);
    }

    public function show(CompanySettings $settings): JsonResponse
    {
        return response()->json($settings->all());
    }

    public function update(Request $request, CompanySettings $settings): JsonResponse
    {
        abort_unless(in_array($request->user()->role->name, ['Master', 'Administrador']), 403);
        $data = $request->validate([
            'company_name' => 'required|string|max:150', 'trade_name' => 'nullable|string|max:150', 'cnpj' => ['nullable', 'regex:/^\d{14}$/'],
            'phone' => 'nullable|string|max:20', 'email' => 'nullable|email|max:150', 'postal_code' => ['nullable', 'regex:/^\d{8}$/'], 'street' => 'nullable|string|max:150',
            'number' => 'nullable|string|max:30', 'district' => 'nullable|string|max:100', 'city' => 'nullable|string|max:100', 'state' => ['nullable', 'regex:/^[A-Z]{2}$/'],
            'complement' => 'nullable|string|max:100', 'instagram' => 'nullable|url|max:255', 'google_review' => 'nullable|url|max:255',
            'budget_validity_days' => 'required|integer|min:1|max:365', 'budget_observation' => 'nullable|string|max:2000', 'budget_institutional_text' => 'required|string|max:1000', 'term_text' => 'required|string|max:10000',
            'warranty_general_enabled' => 'sometimes|boolean', 'warranty_general_text' => 'nullable|string|max:5000', 'show_company_document' => 'required|boolean', 'show_company_address' => 'required|boolean',
            'post_sale_follow_up' => 'sometimes|required|string|max:5000', 'post_sale_google' => 'sometimes|required|string|max:5000', 'post_sale_instagram' => 'sometimes|required|string|max:5000',
        ]);
        if ($request->boolean('warranty_general_enabled') && blank($data['warranty_general_text'] ?? null)) {
            throw ValidationException::withMessages(['warranty_general_text' => 'Informe o texto da garantia geral quando ela estiver ativada.']);
        }
        DB::transaction(function () use ($data, $request) {
            $term = $data['term_text'];
            unset($data['term_text']);
            foreach ($data as $key => $value) {
                $stored = is_bool($value) ? ($value ? '1' : '0') : (string) ($value ?? '');
                DB::table('settings')->updateOrInsert(['key' => $key], ['value' => $stored, 'updated_at' => now(), 'created_at' => now()]);
            }
            $current = DB::table('versioned_templates')->where('type', 'term')->where('active', true)->latest('version')->first();
            if (! $current || $current->body !== $term) {
                DB::table('versioned_templates')->where('type', 'term')->update(['active' => false]);
                DB::table('versioned_templates')->insert(['type' => 'term', 'name' => 'Termo de recebimento', 'version' => (($current->version ?? 0) + 1), 'body' => $term, 'active' => true, 'created_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
            }
            DB::table('audit_logs')->insert(['user_id' => $request->user()->id, 'action' => 'settings.updated', 'subject_type' => 'settings', 'after' => json_encode([...$data, 'term_text' => $term]), 'ip_address' => $request->ip(), 'created_at' => now()]);
        });

        return response()->json($settings->all());
    }

    public function logo(Request $request, LogoProcessor $processor): JsonResponse
    {
        abort_unless(in_array($request->user()->role->name, ['Master', 'Administrador']), 403);
        $request->validate(['logo' => 'required|image|mimes:png,jpg,jpeg,webp|max:8192']);
        $paths = $processor->store($request->file('logo'));
        foreach ($paths as $variant => $path) {
            DB::table('settings')->updateOrInsert(['key' => "logo_$variant"], ['value' => $path, 'type' => 'private_file', 'created_at' => now(), 'updated_at' => now()]);
        }

        return response()->json($paths, 201);
    }

    public function logoFile(string $variant)
    {
        abort_unless(in_array($variant, ['app', 'menu', 'term', 'a4', 'budget', 'report']), 404);
        $path = DB::table('settings')->where('key', "logo_$variant")->value('value');
        abort_unless($path, 404);

        return Storage::disk('local')->response($path, "logo-$variant.webp", ['Content-Type' => 'image/webp']);
    }
}
