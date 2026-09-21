<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('final_share_tokens', function (Blueprint $table) {
            $table->foreignId('generated_document_id')->nullable()->after('service_order_id')->constrained('generated_documents')->nullOnDelete();
            $table->timestamp('revoked_at')->nullable()->after('expires_at')->index();
            $table->timestamp('last_access_at')->nullable()->after('revoked_at');
            $table->unsignedInteger('access_count')->default(0)->after('last_access_at');
        });

        DB::table('final_share_tokens')->update(['revoked_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('final_share_tokens', function (Blueprint $table) {
            $table->dropForeign(['generated_document_id']);
            $table->dropColumn(['generated_document_id', 'revoked_at', 'last_access_at', 'access_count']);
        });
    }
};
