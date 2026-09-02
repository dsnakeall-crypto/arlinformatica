<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Services\Audit;
use App\Services\DocumentValidator;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ClientController extends Controller
{
    public function index(Request $r): JsonResponse
    {
        $q = Client::query()->orderBy('name');
        if ($s = trim((string) $r->query('q'))) {
            $q->where(fn ($x) => $x->where('name', 'like', "%$s%")->orWhere('phone', 'like', "%$s%")->orWhere('document', 'like', '%'.DocumentValidator::normalize($s).'%'));
        }

        return response()->json($q->paginate(20));
    }

    public function store(Request $r, NotificationService $notifications): JsonResponse
    {
        $data = $this->validated($r);
        $client = Client::create($data);
        $notifications->notifyUsers('client_created', 'Novo cliente cadastrado', $client->name, "/clients?client={$client->id}", "client-created:{$client->id}", ['client_id' => $client->id]);

        return response()->json($client, 201);
    }

    public function update(Request $r, Client $client, Audit $audit): JsonResponse
    {
        $before = $client->toArray();
        $data = $this->validated($r, $client->id);
        $client->update($data);
        $audit->record($r, 'client.updated', Client::class, $client->id, $before, $client->fresh()->toArray());

        return response()->json($client->fresh());
    }

    public function show(Client $client): JsonResponse
    {
        $orders = $client->serviceOrders()->latest('received_at')->with(['documents' => fn ($q) => $q->where('type', 'final')->latest('revision')])->get();

        return response()->json(['client' => $client, 'orders' => $orders]);
    }

    private function validated(Request $r, ?int $ignore = null): array
    {
        $data = $r->validate(['name' => 'required|string|max:255', 'document' => ['required', function ($a, $v, $fail) {
            if (! DocumentValidator::valid($v)) {
                $fail('CPF/CNPJ inválido.');
            }
        }], 'phone' => 'required|string|max:20', 'postal_code' => 'required|string|size:8', 'street' => 'required|string|max:255', 'number' => 'required|string|max:30', 'district' => 'required|string|max:255', 'city' => 'required|string|max:255', 'state' => 'required|string|size:2', 'complement' => 'nullable|string|max:255']);
        $data['document'] = DocumentValidator::normalize($data['document']);
        $data['postal_code'] = preg_replace('/\D/', '', $data['postal_code']);
        validator($data, ['document' => Rule::unique('clients', 'document')->ignore($ignore)])->validate();

        return $data;
    }
}
