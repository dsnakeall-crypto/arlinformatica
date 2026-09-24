<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;

class TextImprovementController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['text' => ['required', 'string', 'max:3000']]);
        $key = (string) config('openai.api_key');
        if ($key === '') return response()->json(['message' => 'Não foi possível melhorar o texto agora.'], 503);

        $limitKey = 'text-improvement:'.$request->user()->id;
        if (RateLimiter::tooManyAttempts($limitKey, 20)) return response()->json(['message' => 'Não foi possível melhorar o texto agora.'], 429);
        RateLimiter::hit($limitKey, 60);

        try {
            $response = Http::withToken($key)->acceptJson()->timeout(20)->post('https://api.openai.com/v1/responses', [
                'model' => config('openai.model'),
                'store' => false,
                'max_output_tokens' => 800,
                'instructions' => 'Corrigir ortografia, acentuação, gramática e pontuação. Organizar em frases claras. Manter termos técnicos, nomes de peças, modelos e números exatamente como estão. É proibido acrescentar qualquer fato, diagnóstico, recomendação ou informação que não esteja no texto original. Manter o tamanho próximo do original; não inflar. Responder somente com o texto corrigido, sem aspas, sem comentários, sem introdução.',
                'input' => $data['text'],
            ]);
            if (!$response->successful()) throw new \RuntimeException('OpenAI unavailable');
            $content = collect($response->json('output', []))->flatMap(fn ($item) => $item['content'] ?? [])->firstWhere('type', 'output_text');
            $suggestion = is_array($content) ? ($content['text'] ?? '') : '';
            if (!is_string($suggestion) || trim($suggestion) === '') throw new \RuntimeException('Empty response');
            return response()->json(['suggestion' => trim($suggestion)]);
        } catch (\Throwable) {
            return response()->json(['message' => 'Não foi possível melhorar o texto agora.'], 503);
        }
    }
}
