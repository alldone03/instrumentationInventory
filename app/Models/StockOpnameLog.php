<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockOpnameLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'item_id',
        'user_id',
        'previous_system_stock',
        'previous_actual_stock',
        'new_actual_stock',
        'opname_at',
    ];

    protected $casts = [
        'previous_system_stock' => 'integer',
        'previous_actual_stock' => 'integer',
        'new_actual_stock' => 'integer',
        'opname_at' => 'datetime',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
