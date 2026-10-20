<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cg_vehicles', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('plate', 12)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('cg_vehicle_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained('cg_vehicles')->restrictOnDelete();
            $table->foreignId('debt_id')->unique()->constrained('cg_debts')->restrictOnDelete();
            $table->foreignId('institution_id')->constrained('cg_institutions')->restrictOnDelete();
            $table->foreignId('type_id')->constrained('cg_types')->restrictOnDelete();
            $table->uuid('request_key')->unique();
            $table->string('payload_hash', 64);
            $table->enum('kind', ['wash', 'maintenance']);
            $table->date('occurred_on');
            $table->string('location', 180)->nullable();
            $table->unsignedInteger('odometer_km')->nullable();
            $table->date('next_due_on')->nullable();
            $table->unsignedInteger('next_due_km')->nullable();
            $table->text('work_notes')->nullable();
            $table->text('attention_notes')->nullable();
            $table->enum('responsibility', ['one', 'two', 'shared']);
            $table->unsignedTinyInteger('percent_one');
            $table->unsignedBigInteger('amount_cents');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['vehicle_id', 'occurred_on']);
            $table->index(['kind', 'occurred_on']);
        });

        Schema::create('cg_vehicle_event_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_event_id')->constrained('cg_vehicle_events')->cascadeOnDelete();
            $table->string('description', 180);
            $table->unsignedBigInteger('amount_cents');
            $table->unsignedSmallInteger('position');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cg_vehicle_event_items');
        Schema::dropIfExists('cg_vehicle_events');
        Schema::dropIfExists('cg_vehicles');
    }
};
