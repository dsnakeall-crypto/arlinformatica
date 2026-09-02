<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class Audit
{
    public function record(Request $request, string $action, string $type, ?int $id, mixed $before = null, mixed $after = null): void
    {
        DB::table('audit_logs')->insert([
            'user_id' => $request->user()?->id,
            'action' => $action,
            'subject_type' => $type,
            'subject_id' => $id,
            'before' => $before === null ? null : json_encode($before),
            'after' => $after === null ? null : json_encode($after),
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);
    }
}
