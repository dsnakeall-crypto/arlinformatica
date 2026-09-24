<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;

class TextImprovementController extends Controller
{
    private const INSTRUCTIONS = <<<'PROMPT'
Prioridade 1: corrija ortografia, acentuação, gramática e pontuação. Use linguagem técnica de assistência técnica de informática, fácil de entender para o cliente leigo. Evite siglas e jargões confusos e prefira termos técnicos conhecidos.

Quando o texto for um Laudo Final, use voz impessoal, como "Realizada...", "Efetuada..." ou "Constatado...". Quando for um Problema relatado, registre o relato do cliente, como "Cliente relata que...". Você pode trocar palavras comuns pelo termo técnico equivalente ao que foi escrito, por exemplo, "troca" por "substituição".

Mantenha nomes de peças, modelos e números exatamente como estão. É proibido acrescentar qualquer fato, componente, peça, teste, resultado, causa, diagnóstico ou recomendação que não esteja no texto original. Mantenha o tamanho próximo do original; se ele for longo, enxugue a redação mantendo todos os fatos. Nunca descarte peça, serviço, número ou resultado para caber no limite.

Responda com no máximo 500 caracteres, contando espaços. Responda somente com o texto final, sem aspas, comentários ou introdução.

Exemplo de referência:
Entrada: "Foi feito formatacao e limpeza interna com troca de pasta termica"
Saída: "Realizada formatação do equipamento, limpeza interna e substituição da pasta térmica."
PROMPT;

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['text' => ['required', 'string', 'max:3000']]);
        $key = (string) config('openai.api_key');
        if ($key === '') return response()->json(['message' => 'Não foi possível melhorar o texto agora.'], 503);

        $limitKey = 'text-improvement:'.$request->user()->id;
        if (RateLimiter::tooManyAttempts($limitKey, 20)) return response()->json(['message' => 'Não foi possível melhorar o texto agora.'], 429);
        RateLimiter::hit($limitKey, 60);

        try {
            $suggestion = $this->suggestion($key, $data['text']);
            return response()->json(['suggestion' => $suggestion]);
        } catch (\Throwable) {
            return response()->json(['message' => 'Não foi possível melhorar o texto agora.'], 503);
        }
    }

    private function suggestion(string $key, string $text): string
    {
        $response = Http::withToken($key)->acceptJson()->timeout(20)->post('https://api.openai.com/v1/responses', [
            'model' => config('openai.model'),
            'store' => false,
            'max_output_tokens' => 300,
            'instructions' => self::INSTRUCTIONS,
            'input' => $text,
        ]);
        if (!$response->successful()) throw new \RuntimeException('OpenAI unavailable');

        $content = collect($response->json('output', []))->flatMap(fn ($item) => $item['content'] ?? [])->firstWhere('type', 'output_text');
        $suggestion = is_array($content) ? ($content['text'] ?? '') : '';
        if (!is_string($suggestion) || trim($suggestion) === '') throw new \RuntimeException('Empty response');

        return trim($suggestion);
    }
}
