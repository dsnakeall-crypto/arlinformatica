<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Services\DocumentValidator;
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

    public function store(Request $r): JsonResponse
    {
        $data = $r->validate(['name' => 'required|string|max:255', 'document' => ['required', function ($a, $v, $fail) {
            if (! DocumentValidator::valid($v)) {
                $fail('CPF/CNPJ inválido.');
            }
        }], 'phone' => 'required|string|max:20', 'postal_code' => 'required|string', 'street' => 'required|string', 'number' => 'required|string', 'district' => 'required|string', 'city' => 'required|string', 'state' => 'required|string|size:2', 'complement' => 'nullable|string']);
        $data['document'] = DocumentValidator::normalize($data['document']);
        validator($data, ['document' => Rule::unique('clients', 'document')])->validate();
        $client = Client::create($data);

        return response()->json($client, 201);
    }
}
