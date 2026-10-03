<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('roles')->insertOrIgnore(['name' => 'Controle de Gasto', 'permissions' => json_encode(['expense-control']), 'created_at' => now(), 'updated_at' => now()]);
        DB::table('roles')->insertOrIgnore(['name' => 'Usuário local', 'permissions' => json_encode(['clients.create', 'orders.create']), 'created_at' => now(), 'updated_at' => now()]);
        Schema::create('cg_people', function (Blueprint $t) {
            $t->unsignedTinyInteger('id')->primary();
            $t->string('name', 80);
            $t->foreignId('user_id')->nullable()->unique()->constrained()->nullOnDelete();
            $t->unsignedTinyInteger('default_percent');
            $t->timestamps();
        });
        DB::table('cg_people')->insert([
            ['id' => 1, 'name' => 'Allan', 'default_percent' => 50, 'created_at' => now(), 'updated_at' => now()],
            ['id' => 2, 'name' => 'Carol', 'default_percent' => 50, 'created_at' => now(), 'updated_at' => now()],
        ]);
        Schema::create('cg_institutions', function (Blueprint $t) {
            $t->id();
            $t->string('name', 120);
            $t->unsignedTinyInteger('due_day')->default(10);
            $t->string('color', 7)->default('#c9002c');
            $t->boolean('active')->default(true);
            $t->timestamps();
        });
        Schema::create('cg_types', function (Blueprint $t) {
            $t->id();
            $t->string('name', 80)->unique();
            $t->boolean('active')->default(true);
            $t->timestamps();
        });
        Schema::create('cg_debts', function (Blueprint $t) {
            $t->id();
            $t->foreignId('institution_id')->constrained('cg_institutions');
            $t->foreignId('type_id')->constrained('cg_types');
            $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->uuid('request_key')->unique();
            $t->string('payload_hash', 64);
            $t->string('name', 200);
            $t->string('recurrence', 20);
            $t->string('responsibility', 10);
            $t->unsignedTinyInteger('percent_one');
            $t->unsignedBigInteger('amount_cents');
            $t->unsignedSmallInteger('installment_count');
            $t->unsignedSmallInteger('first_number')->default(1);
            $t->date('start_on');
            $t->unsignedTinyInteger('due_day');
            $t->text('notes')->nullable();
            $t->date('ended_on')->nullable();
            $t->timestamp('cancelled_at')->nullable();
            $t->string('cancellation_reason', 500)->nullable();
            $t->timestamps();
            $t->index(['institution_id', 'type_id']);
        });
        Schema::create('cg_installments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('debt_id')->constrained('cg_debts');
            $t->unsignedSmallInteger('number');
            $t->date('month_on');
            $t->date('due_on');
            $t->unsignedBigInteger('amount_cents');
            $t->unsignedBigInteger('share_one_cents');
            $t->unsignedBigInteger('share_two_cents');
            $t->timestamps();
            $t->unique(['debt_id', 'month_on']);
            $t->index(['month_on', 'due_on']);
        });
        Schema::create('cg_operations', function (Blueprint $t) {
            $t->id();
            $t->uuid('request_key')->unique();
            $t->string('payload_hash', 64);
            $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
        });
        Schema::create('cg_entries', function (Blueprint $t) {
            $t->id();
            $t->foreignId('operation_id')->constrained('cg_operations');
            $t->foreignId('installment_id')->constrained('cg_installments');
            $t->string('kind', 20);
            $t->unsignedTinyInteger('paid_by')->nullable();
            $t->date('occurred_on');
            $t->unsignedBigInteger('amount_cents');
            $t->unsignedBigInteger('credit_one_cents');
            $t->unsignedBigInteger('credit_two_cents');
            $t->string('notes', 500)->nullable();
            $t->timestamp('reversed_at')->nullable();
            $t->string('reversal_reason', 500)->nullable();
            $t->foreignId('reversed_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestamps();
            $t->index(['installment_id', 'reversed_at']);
        });
    }

    public function down(): void
    {
        foreach (['cg_entries', 'cg_operations', 'cg_installments', 'cg_debts', 'cg_types', 'cg_institutions', 'cg_people'] as $table) {
            Schema::dropIfExists($table);
        }
        // Roles may already be assigned. A rollback must not delete accounts or their access profiles.
    }
};
