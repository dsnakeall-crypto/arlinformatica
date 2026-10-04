<?php

namespace App\Console\Commands;

use App\Models\Role;
use App\Models\User;
use App\Support\UserPasswordPolicy;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class InstallMaster extends Command
{
    protected $signature = 'arl:install {--name=} {--login=}';

    protected $description = 'Cria com segurança o primeiro usuário Master e encerra a instalação';

    public function handle(): int
    {
        if (User::exists() || DB::table('settings')->where('key', 'installed_at')->exists()) {
            $this->error('Instalação já concluída.');

            return self::FAILURE;
        } $name = $this->option('name') ?: $this->ask('Nome do Master');
        $login = $this->option('login') ?: $this->ask('Login');
        $password = $this->secret('Senha (mínimo 6 caracteres, uma letra maiúscula e um caractere especial)');
        if (Validator::make(['password' => $password], ['password' => UserPasswordPolicy::rules()])->fails()) {
            $this->error('A senha deve ter ao menos 6 caracteres, uma letra maiúscula e um caractere especial.');

            return self::FAILURE;
        } DB::transaction(function () use ($name, $login, $password) {
            $role = Role::firstOrCreate(['name' => 'Master'], ['permissions' => ['*']]);
            User::create(['role_id' => $role->id, 'name' => $name, 'login' => $login, 'password' => Hash::make($password), 'active' => true]);
            DB::table('settings')->insert(['key' => 'installed_at', 'value' => now()->toIso8601String(), 'type' => 'datetime', 'created_at' => now(), 'updated_at' => now()]);
        });
        $this->info('Master criado; instalador bloqueado.');

        return self::SUCCESS;
    }
}
