<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->string('description')->default('')->after('title');
            $table->string('deduplication_key')->nullable()->after('type');
            $table->boolean('active')->default(true)->after('read_at');
            $table->unique(['user_id', 'deduplication_key']);
            $table->index(['user_id', 'active', 'read_at']);
        });
        Schema::table('post_sale_cycles', function (Blueprint $table) {
            $table->timestamp('archived_at')->nullable()->after('eligible_at');
            $table->string('archive_reason')->nullable()->after('archived_at');
            $table->index(['client_id', 'active']);
        });
        Schema::table('post_sale_actions', function (Blueprint $table) {
            $table->longText('message_snapshot')->nullable()->after('confirmed_by');
        });
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('endpoint');
            $table->string('endpoint_hash', 64);
            $table->text('public_key');
            $table->text('auth_token');
            $table->string('content_encoding', 20)->default('aes128gcm');
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();
            $table->unique('endpoint_hash');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
        Schema::table('post_sale_actions', fn (Blueprint $table) => $table->dropColumn('message_snapshot'));
        Schema::table('post_sale_cycles', function (Blueprint $table) {
            $table->dropIndex(['client_id', 'active']);
            $table->dropColumn(['archived_at', 'archive_reason']);
        });
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'deduplication_key']);
            $table->dropIndex(['user_id', 'active', 'read_at']);
            $table->dropColumn(['description', 'deduplication_key', 'active']);
        });
    }
};
