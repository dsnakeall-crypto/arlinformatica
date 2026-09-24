<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;

class TextImprovementController extends Controller
{
    private const INSTRUCTIONS = <<<'PROMPT'
Retorne um objeto JSON com os campos "simples" e "tecnica". Corrija ortografia, acentuação, gramática e pontuação nas duas versões. Mantenha todos os fatos do original: todo serviço, peça, sistema, programa e teste citado deve aparecer.

É proibido acrescentar fato, resultado de teste, estado de componente, causa, diagnóstico, garantia, liberação do equipamento, classificação como "corretiva" ou "preventiva", "revisado", "com sucesso" ou qualquer informação não escrita pelo usuário. Resultado só aparece se foi informado: "teste de placa mae ok" permite dizer que a placa apresentou funcionamento normal; "teste de placa mae" sozinho não permite. Mantenha nomes de peças, modelos e números exatamente como estão.

"simples": corrija o português em linguagem técnica de assistência técnica de informática, fácil de entender para o cliente leigo, sem inflar. Pode trocar palavras comuns pelo termo técnico equivalente ao que foi escrito, por exemplo, "troca" por "substituição". Para Laudo Final, use voz impessoal, como "Realizada...", "Efetuada..." ou "Constatado...". Para Problema relatado, registre o relato do cliente, como "Cliente relata que...".

"tecnica": escreva uma versão mais encorpada e formal, como laudo técnico profissional. Pode usar mais de uma frase e expressões neutras de enquadramento, como "Realizado procedimento de manutenção no equipamento, compreendendo...", sem acrescentar fatos.

Cada versão deve ter no máximo 500 caracteres, contando espaços. Se o original for longo, enxugue a redação mantendo todos os fatos. Nunca descarte peça, serviço, sistema, programa, número, teste ou resultado para caber no limite. Responda somente com o objeto JSON solicitado, sem comentários ou campos extras.

Exemplo de referência:
Entrada: "fiz formatacao do pc com isntalacao do windwos 11 e apps basicos e limpesa interna do gabinet com troca de pasta termica e teste de placa mae"
simples: "Realizada formatação do computador com instalação do Windows 11 e aplicativos básicos, limpeza interna do gabinete, substituição da pasta térmica e teste da placa-mãe."
tecnica: "Realizado procedimento de manutenção no equipamento, compreendendo a formatação completa do computador, com instalação do sistema operacional Windows 11 e dos aplicativos básicos. Efetuada a higienização interna do gabinete, com substituição da pasta térmica, e executado teste da placa-mãe."
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
            $suggestions = $this->suggestions($key, $data['text']);
            $warnings = [];

            if ($this->hasLongSuggestion($suggestions)) {
                $suggestions = $this->suggestions($key, $data['text'], true);

                foreach ($suggestions as $type => $suggestion) {
                    if (mb_strlen($suggestion) > 500) {
                        $warnings[$type] = 'A sugestão passou de 500 caracteres.';
                    }
                }
            }

            $payload = ['suggestions' => $suggestions];
            if ($warnings !== []) $payload['warnings'] = $warnings;

            return response()->json($payload);
        } catch (\Throwable) {
            return response()->json(['message' => 'Não foi possível melhorar o texto agora.'], 503);
        }
    }

    /** @return array{simples: string, tecnica: string} */
    private function suggestions(string $key, string $text, bool $reinforceLimit = false): array
    {
        $instructions = self::INSTRUCTIONS;
        if ($reinforceLimit) {
            $instructions .= "\n\nUma ou ambas as versões anteriores ultrapassaram 500 caracteres. Reescreva as duas versões com no máximo 500 caracteres cada, contando espaços, sem descartar nenhum fato.";
        }

        $response = Http::withToken($key)->acceptJson()->timeout(20)->post('https://api.openai.com/v1/responses', [
            'model' => config('openai.model'),
            'store' => false,
            'max_output_tokens' => 600,
            'instructions' => $instructions,
            'input' => $text,
            'text' => [
                'format' => [
                    'type' => 'json_schema',
                    'name' => 'text_improvements',
                    'strict' => true,
                    'schema' => [
                        'type' => 'object',
                        'properties' => [
                            'simples' => ['type' => 'string'],
                            'tecnica' => ['type' => 'string'],
                        ],
                        'required' => ['simples', 'tecnica'],
                        'additionalProperties' => false,
                    ],
                ],
            ],
        ]);
        if (!$response->successful()) throw new \RuntimeException('OpenAI unavailable');

        $content = collect($response->json('output', []))->flatMap(fn ($item) => $item['content'] ?? [])->firstWhere('type', 'output_text');
        $json = is_array($content) ? ($content['text'] ?? '') : '';
        if (!is_string($json) || trim($json) === '') throw new \RuntimeException('Empty response');

        $suggestions = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($suggestions)
            || array_keys($suggestions) !== ['simples', 'tecnica']
            || !is_string($suggestions['simples'])
            || !is_string($suggestions['tecnica'])
            || trim($suggestions['simples']) === ''
            || trim($suggestions['tecnica']) === '') {
            throw new \RuntimeException('Invalid response');
        }

        return ['simples' => trim($suggestions['simples']), 'tecnica' => trim($suggestions['tecnica'])];
    }

    /** @param array{simples: string, tecnica: string} $suggestions */
    private function hasLongSuggestion(array $suggestions): bool
    {
        return mb_strlen($suggestions['simples']) > 500 || mb_strlen($suggestions['tecnica']) > 500;
    }
}
