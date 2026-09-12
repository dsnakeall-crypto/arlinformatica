<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use LogicException;

class ServiceOrder extends Model
{
    use SoftDeletes;

    protected $fillable = ['number', 'client_id', 'equipment_type_id', 'manufacturer_id', 'equipment_description', 'attendance_type', 'status', 'reported_problem', 'intake_condition', 'received_at', 'completed_at', 'result', 'technical_report', 'final_report', 'subtotal_cents', 'discount_cents', 'total_cents', 'created_by'];

    protected function casts(): array
    {
        return ['received_at' => 'datetime', 'completed_at' => 'datetime'];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class)->withTrashed();
    }

    public function items(): HasMany
    {
        return $this->hasMany(ServiceOrderItem::class);
    }

    public function histories(): HasMany
    {
        return $this->hasMany(StatusHistory::class);
    }

    public function checklists(): HasMany
    {
        return $this->hasMany(ServiceOrderChecklist::class);
    }

    public function photos(): HasMany
    {
        return $this->hasMany(ServiceOrderPhoto::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(GeneratedDocument::class);
    }

    public function snapshot()
    {
        return $this->hasOne(ServiceOrderSnapshot::class);
    }

    protected static function booted(): void
    {
        static::creating(function (ServiceOrder $order) {
            if (blank($order->equipment_description)) {
                $manual = trim((string) request()->input('equipment_description', ''));
                if ($manual !== '') {
                    $order->equipment_description = $manual;
                }
            }

            if (blank($order->equipment_description) && $order->reopened_from_order_id) {
                $order->equipment_description = static::withTrashed()
                    ->whereKey($order->reopened_from_order_id)
                    ->value('equipment_description');
            }

            if (blank($order->equipment_description) && $order->equipment_type_id) {
                $order->equipment_description = DB::table('equipment_types')
                    ->where('id', $order->equipment_type_id)
                    ->value('name');
            }
        });

        static::deleting(function (ServiceOrder $order) {
            if ($order->isForceDeleting()) {
                throw new LogicException('Ordens de serviço preservam o histórico e não podem ser removidas fisicamente.');
            }
        });
    }
}
