<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use Notifiable;

    protected $attributes = ['sidebar_pinned' => false];

    protected $fillable = ['role_id', 'name', 'login', 'email', 'password', 'active', 'sidebar_pinned', 'expense_control_access'];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return ['password' => 'hashed', 'active' => 'boolean', 'sidebar_pinned' => 'boolean', 'expense_control_access' => 'boolean'];
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function hasRole(string ...$roles): bool
    {
        return $this->active && in_array($this->role?->name, $roles, true);
    }

    public function canUseExpenseControl(): bool
    {
        if (! $this->active) {
            return false;
        }

        $role = $this->role?->name;

        return in_array($role, ['Master', 'Controle de Gasto'], true)
            || (in_array($role, ['Administrador', 'Administrador Simples'], true)
                && (bool) $this->expense_control_access);
    }
}
