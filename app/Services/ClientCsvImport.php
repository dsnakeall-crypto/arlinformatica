<?php

namespace App\Services;

use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ClientCsvImport
{
    public const HEADER = ['Nome', 'CPF/CNPJ', 'Endereço', 'Número', 'Bairro', 'Cidade', 'UF', 'CEP', 'Celular'];

    public function run(Request $request): array
    {
        $stream = fopen($request->file('file')->getRealPath(), 'rb');
        try {
            if (fread($stream, 3) !== "\xEF\xBB\xBF") {
                rewind($stream);
            }
            if (fgetcsv($stream, 0, ';', '"', '') !== self::HEADER) {
                throw ValidationException::withMessages(['file' => 'Cabeçalho inválido. Esperado: '.implode(';', self::HEADER)]);
            }

            return DB::transaction(function () use ($stream, $request) {
                $result = ['read' => 0, 'created' => 0, 'ignored' => 0, 'errors' => []];
                $batch = [];
                $line = 2;
                while (! feof($stream)) {
                    $start = ftell($stream);
                    $row = fgetcsv($stream, 0, ';', '"', '');
                    if ($row === false) {
                        break;
                    }
                    $end = ftell($stream);
                    fseek($stream, $start);
                    $raw = fread($stream, $end - $start);
                    $rowLine = $line;
                    $line += max(1, substr_count($raw, "\n"));
                    $result['read']++;
                    if (! mb_check_encoding($raw, 'UTF-8') || count($row) !== 9) {
                        $result['errors'][] = ['line' => $rowLine, 'reason' => 'A linha deve ter 9 colunas e codificação UTF-8.'];

                        continue;
                    }
                    $data = array_combine(['name', 'document', 'street', 'number', 'district', 'city', 'state', 'postal_code', 'phone'], array_map(fn ($value) => trim($value ?? ''), $row));
                    $data['document'] = DocumentValidator::normalize($data['document']);
                    $data['postal_code'] = preg_replace('/\D/', '', $data['postal_code']);
                    $data['state'] = mb_strtoupper($data['state']);
                    $validator = validator($data, [
                        'name' => 'required|string|max:255',
                        'document' => ['required', function ($attribute, $value, $fail) {
                            if (! DocumentValidator::valid($value)) {
                                $fail('CPF/CNPJ inválido.');
                            }
                        }],
                        'phone' => 'required|string|max:20',
                        'street' => 'nullable|string|max:255', 'number' => 'nullable|string|max:30',
                        'district' => 'nullable|string|max:255', 'city' => 'nullable|string|max:255',
                        'state' => 'nullable|string|size:2', 'postal_code' => 'nullable|string|size:8',
                    ], ['required' => ':attribute é obrigatório.', 'max' => ':attribute excede o tamanho permitido.', 'size' => ':attribute tem tamanho inválido.'], [
                        'name' => 'Nome', 'document' => 'CPF/CNPJ', 'phone' => 'Celular', 'state' => 'UF', 'postal_code' => 'CEP',
                    ]);
                    if ($validator->fails()) {
                        $result['errors'][] = ['line' => $rowLine, 'reason' => implode(' ', $validator->errors()->all())];

                        continue;
                    }
                    $batch[] = $data + ['created_at' => now(), 'updated_at' => now()];
                    if (count($batch) === 50) {
                        $this->flush($batch, $result);
                        $batch = [];
                    }
                }
                $this->flush($batch, $result);
                $result['failed'] = count($result['errors']);
                app(Audit::class)->record($request, 'clients.imported', Client::class, null, null, array_diff_key($result, ['errors' => true]));

                return $result;
            });
        } finally {
            fclose($stream);
        }
    }

    private function flush(array $batch, array &$result): void
    {
        if ($batch === []) {
            return;
        }
        // Include archived clients: their documents are still protected by the unique index.
        $existing = array_fill_keys(DB::table('clients')->whereIn('document', array_column($batch, 'document'))->pluck('document')->all(), true);
        $insert = [];
        foreach ($batch as $row) {
            if (isset($existing[$row['document']])) {
                $result['ignored']++;
            } else {
                $existing[$row['document']] = true;
                $insert[] = $row;
            }
        }
        if ($insert !== []) {
            // A concurrent conflict fails the transaction instead of silently losing data.
            DB::table('clients')->insert($insert);
            $result['created'] += count($insert);
        }
    }
}
