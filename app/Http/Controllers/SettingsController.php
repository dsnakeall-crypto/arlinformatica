<?php

namespace App\Http\Controllers;

use App\Services\Audit;
use App\Services\CompanySettings;
use App\Services\LogoProcessor;
use App\Services\SignatureProcessor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    public function operational(CompanySettings $settings): JsonResponse
    {
        $all = $settings->all();

        return response()->json([
            'budget_validity_days' => (int) $all['budget_validity_days'],
            'company_name' => (string) $all['company_name'],
            'trade_name' => (string) $all['trade_name'],
        ]);
    }

    public function theme(CompanySettings $settings): JsonResponse
    {
        return response()->json($settings->theme());
    }

    public function updateTheme(Request $request, CompanySettings $settings): JsonResponse
    {
        abort_unless(in_array($request->user()->role->name, ['Master', 'Administrador']), 403);
        $request->validate([
            'theme_primary' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'theme_sidebar' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'theme_accent' => ['required', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        return response()->json($settings->theme());
    }

    public function show(CompanySettings $settings): JsonResponse
    {
        return response()->json($settings->all());
    }

    public function update(Request $request, CompanySettings $settings): JsonResponse
    {
        abort_unless(in_array($request->user()->role->name, ['Master', 'Administrador']), 403);
        $request->merge([
            'cnpj' => preg_replace('/\D/', '', (string) $request->input('cnpj', '')),
            'phone' => preg_replace('/\D/', '', (string) $request->input('phone', '')),
            'postal_code' => preg_replace('/\D/', '', (string) $request->input('postal_code', '')),
            'state' => mb_strtoupper(trim((string) $request->input('state', ''))),
        ]);
        $data = $request->validate([
            'company_name' => 'required|string|max:150', 'trade_name' => 'nullable|string|max:150', 'cnpj' => ['nullable', 'regex:/^\d{14}$/'],
            'phone' => ['nullable', 'regex:/^\d{10,11}$/'], 'email' => 'nullable|email|max:150', 'postal_code' => ['nullable', 'regex:/^\d{8}$/'], 'street' => 'nullable|string|max:150',
            'number' => 'nullable|string|max:30', 'district' => 'nullable|string|max:100', 'city' => 'nullable|string|max:100', 'state' => ['nullable', 'regex:/^[A-Z]{2}$/'],
            'complement' => 'nullable|string|max:100', 'instagram' => 'nullable|url|max:255', 'google_review' => 'nullable|url|max:255',
            'budget_validity_days' => 'required|integer|min:1|max:365', 'budget_observation' => 'nullable|string|max:2000', 'budget_institutional_text' => 'required|string|max:1000', 'term_text' => 'required|string|max:10000',
            'show_company_document' => 'required|boolean', 'show_company_address' => 'required|boolean',
        ], [
            'cnpj.regex' => 'O CNPJ deve conter 14 números.',
            'phone.regex' => 'O telefone deve conter 10 ou 11 números.',
            'postal_code.regex' => 'O CEP deve conter 8 números.',
            'state.regex' => 'A UF deve conter exatamente 2 letras.',
        ]);
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

    public function signature(Request $request, SignatureProcessor $processor): JsonResponse
    {
        abort_unless(in_array($request->user()->role->name, ['Master', 'Administrador']), 403);
        $request->validate(['signature' => 'required|image|mimes:png,jpg,jpeg,webp|max:8192']);
        $data = $processor->process($request->file('signature'));
        $path = 'company/signatures/'.str()->uuid().'.png';
        Storage::disk('local')->put($path, $data);
        $previous = DB::table('settings')->where('key', 'technical_signature')->value('value');
        DB::table('settings')->updateOrInsert(['key' => 'technical_signature'], ['value' => $path, 'type' => 'private_file', 'created_at' => now(), 'updated_at' => now()]);
        if ($previous && $previous !== $path) {
            Storage::disk('local')->delete($previous);
        }

        return response()->json(['configured' => true], 201);
    }

    public function signatureFile()
    {
        $path = DB::table('settings')->where('key', 'technical_signature')->value('value');
        abort_unless($path, 404);

        return Storage::disk('local')->response($path, 'assinatura-tecnica.png', ['Content-Type' => 'image/png']);
    }

    public function destroySignature(Request $request, Audit $audit): JsonResponse
    {
        abort_unless(in_array($request->user()->role->name, ['Master', 'Administrador']), 403);
        $path = DB::table('settings')->where('key', 'technical_signature')->value('value');

        DB::transaction(function () use ($audit, $path, $request) {
            DB::table('settings')->where('key', 'technical_signature')->delete();
            $audit->record(
                $request,
                'settings.signature_removed',
                'settings',
                null,
                ['configured' => filled($path)],
                ['configured' => false],
            );
        });

        if ($path) {
            Storage::disk('local')->delete($path);
        }

        return response()->json(['configured' => false]);
    }
}
