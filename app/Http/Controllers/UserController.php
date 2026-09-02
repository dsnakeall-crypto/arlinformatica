<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::query()->with('role:id,name')->select(['id', 'role_id', 'name', 'login', 'email', 'active', 'created_at'])->latest();
        if ($search = trim((string) $request->query('q'))) {
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('login', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
        }

        return response()->json(['users' => $query->paginate(20), 'roles' => Role::query()->select('id', 'name')->get()]);
    }

    public function store(Request $request, Audit $audit): JsonResponse
    {
        $data = $this->validated($request);
        $user = User::create($data);
        $audit->record($request, 'user.created', User::class, $user->id, null, $user->only(['name', 'login', 'email', 'role_id', 'active']));

        return response()->json($this->safe($user), 201);
    }

    public function update(Request $request, User $user, Audit $audit): JsonResponse
    {
        $before = $user->only(['name', 'login', 'email', 'role_id', 'active']);
        $data = $this->validated($request, $user, false);
        $this->protectLastMaster($user, $data);
        $user->update($data);
        $after = $user->fresh()->only(array_keys($before));
        $audit->record($request, $before['role_id'] !== $after['role_id'] ? 'user.role_changed' : 'user.updated', User::class, $user->id, $before, $after);

        return response()->json($this->safe($user->fresh()));
    }

    public function resetPassword(Request $request, User $user, Audit $audit): JsonResponse
    {
        $data = $request->validate(['password' => $this->passwordRules()]);
        $user->update(['password' => $data['password']]);
        $audit->record($request, 'user.password_reset', User::class, $user->id);

        return response()->json(['message' => 'Senha redefinida com segurança.']);
    }

    private function validated(Request $request, ?User $user = null, bool $password = true): array
    {
        $rules = [
            'name' => 'required|string|max:255',
            'login' => ['required', 'string', 'max:255', Rule::unique('users')->ignore($user?->id)],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users')->ignore($user?->id)],
            'role_id' => 'required|exists:roles,id',
            'active' => 'required|boolean',
        ];
        $rules['password'] = $password ? $this->passwordRules() : 'prohibited';

        return $request->validate($rules);
    }

    private function passwordRules(): array
    {
        return ['required', 'string', 'min:12', 'max:255', 'regex:/[a-z]/', 'regex:/[A-Z]/', 'regex:/[0-9]/', 'regex:/[^a-zA-Z0-9]/', 'confirmed'];
    }

    private function protectLastMaster(User $user, array $data): void
    {
        $master = Role::where('name', 'Master')->value('id');
        if ($user->role_id === $master && (! $data['active'] || (int) $data['role_id'] !== (int) $master)) {
            abort_if(User::where('role_id', $master)->where('active', true)->whereKeyNot($user->id)->doesntExist(), 422, 'O último Master ativo não pode ser desativado ou rebaixado.');
        }
    }

    private function safe(User $user): array
    {
        return $user->load('role:id,name')->only(['id', 'name', 'login', 'email', 'active', 'created_at', 'role']);
    }
}
