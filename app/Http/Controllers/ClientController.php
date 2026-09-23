<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Services\Audit;
use App\Services\DocumentValidator;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Illuminate\Validation\Rule;

class ClientController extends Controller
{
    public function index(Request $r): JsonResponse
    {
        $q = Client::query();
        $search = preg_replace('/\s+/', ' ', trim((string) $r->query('q')));
        if ($search !== '') {
            $terms = array_values(array_filter(explode(' ', $search)));
            foreach ($terms as $term) {
                $document = DocumentValidator::normalize($term);
                $q->where(function ($query) use ($term, $document) {
                    $query->where('name', 'like', "%{$term}%")
                        ->orWhere('phone', 'like', "%{$term}%");
                    if ($document !== '') {
                        $query->orWhere('document', 'like', "%{$document}%");
                    }
                });
            }

            // Pesquisa progressiva: quem começa pelo texto digitado aparece primeiro,
            // sem esconder os demais resultados que contêm o termo.
            $q->orderByRaw('CASE WHEN LOWER(name) LIKE ? THEN 0 ELSE 1 END', [mb_strtolower($search).'%']);
        }
        $q->orderBy('name')->orderBy('id');

        // A Gestão de Clientes carrega o catálogo inteiro uma única vez e filtra localmente.
        // Os demais consumidores continuam usando a paginação existente por padrão.
        if ($r->boolean('all')) {
            return response()->json(['data' => $q->get()]);
        }

        $perPage = max(1, min(100, (int) $r->integer('per_page', $search !== '' ? 100 : 20)));

        return response()->json($q->paginate($perPage));
    }

    public function store(Request $r, NotificationService $notifications): JsonResponse
    {
        $data = $this->validated($r);
        $client = Client::create($data);
        $notifications->notifyUsers('client_created', 'Novo cliente cadastrado', $client->name, "/clients?client={$client->id}", "client-created:{$client->id}", ['client_id' => $client->id]);

        return response()->json($client, 201);
    }

    public function documentStatus(Request $request): JsonResponse
    {
        $document = DocumentValidator::normalize((string) $request->query('document'));
        $label = $this->documentLabel($document);

        if (! DocumentValidator::valid($document)) {
            return response()->json([
                'status' => 'invalid',
                'message' => "O {$label} informado é inválido.",
            ]);
        }

        $client = Client::withTrashed()->where('document', $document)->first();
        if (! $client || $client->id === $request->integer('ignore')) {
            return response()->json(['status' => 'available']);
        }

        return response()->json([
            'status' => $client->trashed() ? 'archived' : 'duplicate',
            'message' => $this->duplicateDocumentMessage($document, $client->trashed()),
        ]);
    }

    public function update(Request $r, Client $client, Audit $audit): JsonResponse
    {
        $before = $client->toArray();
        $data = $this->validated($r, $client->id);
        DB::transaction(function () use ($client, $data) {
            $client->update($data);
            $snapshot = $client->fresh()->toArray();
            $openOrderIds = DB::table('service_orders')
                ->where('client_id', $client->id)
                ->whereNotIn('status', ['completed', 'interrupted'])
                ->whereNull('deleted_at')
                ->pluck('id');

            DB::table('service_order_snapshots')
                ->whereIn('service_order_id', $openOrderIds)
                ->update(['client' => json_encode($snapshot), 'updated_at' => now()]);
        });
        $audit->record($r, 'client.updated', Client::class, $client->id, $before, $client->fresh()->toArray());

        return response()->json($client->fresh());
    }

    public function destroy(Request $r, Client $client, Audit $audit): JsonResponse
    {
        $before = $client->toArray();
        $client->delete();
        $audit->record($r, 'client.deleted', Client::class, $client->id, $before, [
            'id' => $client->id,
            'deleted_at' => $client->deleted_at?->toISOString(),
            'soft_deleted' => true,
        ]);

        return response()->json([
            'deleted' => true,
            'id' => $client->id,
            'message' => 'Cliente removido da listagem. O histórico de OS foi preservado.',
        ]);
    }

    public function show(Client $client): JsonResponse
    {
        $orders = $client->serviceOrders()
            ->latest('received_at')
            ->with([
                'items' => fn ($q) => $q
                    ->where(function ($items) {
                        $items->where(function ($draftItems) {
                            $draftItems->whereNull('finalization_id')
                                ->whereNotExists(function ($finalizations) {
                                    $finalizations->selectRaw('1')
                                        ->from('service_order_finalizations')
                                        ->whereColumn('service_order_finalizations.service_order_id', 'service_order_items.service_order_id');
                                });
                        })->orWhereRaw('finalization_id = (SELECT latest_finalization.id FROM service_order_finalizations AS latest_finalization WHERE latest_finalization.service_order_id = service_order_items.service_order_id ORDER BY latest_finalization.revision DESC LIMIT 1)');
                    })
                    ->orderBy('id'),
                'documents' => fn ($q) => $q->whereIn('type', ['final', 'final-record', 'budget'])->latest('issued_at'),
            ])
            ->get();

        $budgets = DB::table('budgets')
            ->whereIn('service_order_id', $orders->pluck('id'))
            ->orderByDesc('revision')
            ->get()
            ->groupBy('service_order_id');

        $orders->each(function ($order) use ($budgets) {
            $order->setRelation('documents', $order->documents
                ->filter(fn ($document) => Storage::disk('local')->exists($document->path))
                ->values());
            $order->setAttribute('budgets', $budgets->get($order->id, collect())->values());
        });

        return response()->json(['client' => $client, 'orders' => $orders]);
    }

    private function validated(Request $r, ?int $ignore = null): array
    {
        $data = $r->validate(['name' => 'required|string|max:255', 'document' => ['required', function ($a, $v, $fail) {
            if (! DocumentValidator::valid($v)) {
                $fail('O '.($this->documentLabel(DocumentValidator::normalize($v))).' informado é inválido.');
            }
        }], 'phone' => 'required|string|max:20', 'postal_code' => 'nullable|string|size:8', 'street' => 'required|string|max:255', 'number' => 'nullable|string|max:30', 'district' => 'nullable|string|max:255', 'city' => 'nullable|string|max:255', 'state' => 'nullable|string|size:2', 'complement' => 'nullable|string|max:255'], [
            'name.required' => 'Informe o nome ou razão social.',
            'document.required' => 'Informe o CPF ou CNPJ.',
            'phone.required' => 'Informe o telefone.',
            'street.required' => 'Informe o endereço.',
            'postal_code.size' => 'O CEP deve ter 8 dígitos.',
            'state.size' => 'O estado deve ter 2 letras.',
        ]);
        $data['document'] = DocumentValidator::normalize($data['document']);
        $data['postal_code'] = filled($data['postal_code'] ?? null) ? preg_replace('/\D/', '', $data['postal_code']) : null;
        $existing = Client::withTrashed()
            ->where('document', $data['document'])
            ->when($ignore, fn ($query) => $query->whereKeyNot($ignore))
            ->first();

        if ($existing) {
            throw ValidationException::withMessages([
                'document' => [$this->duplicateDocumentMessage($data['document'], $existing->trashed())],
            ]);
        }

        validator($data, ['document' => Rule::unique('clients', 'document')->ignore($ignore)], [
            'document.unique' => $this->duplicateDocumentMessage($data['document']),
        ])->validate();

        return $data;
    }

    private function documentLabel(string $document): string
    {
        return strlen($document) === 14 ? 'CNPJ' : 'CPF';
    }

    private function duplicateDocumentMessage(string $document, bool $archived = false): string
    {
        $message = 'Este '.$this->documentLabel($document).' já está cadastrado.';

        return $archived ? $message.' O cliente foi removido da lista.' : $message;
    }
}
