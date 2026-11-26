<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class InventoryTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'transaction_code',
        'user_id',
        'requester_name',
        'requester_work_area_id',
        'transaction_type',
        'status',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'checkout_photo_path',
        'return_photo_path',
        'returned_at',
        'purpose_notes', 
        'requester_name', 
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'returned_at' => 'datetime',
    ];

    protected $appends = [
        'checkout_photo_url',
        'return_photo_url',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function requesterWorkArea(): BelongsTo
    {
        return $this->belongsTo(WorkArea::class, 'requester_work_area_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(InventoryTransactionItem::class);
    }

    public function getCheckoutPhotoUrlAttribute(): ?string
    {
        if (!$this->checkout_photo_path) {
            return null;
        }

        if (str_starts_with($this->checkout_photo_path, 'http://') || str_starts_with($this->checkout_photo_path, 'https://')) {
            return $this->checkout_photo_path;
        }

        return Storage::url($this->checkout_photo_path);
    }

    public function getReturnPhotoUrlAttribute(): ?string
    {
        if (!$this->return_photo_path) {
            return null;
        }

        if (str_starts_with($this->return_photo_path, 'http://') || str_starts_with($this->return_photo_path, 'https://')) {
            return $this->return_photo_path;
        }

        return Storage::url($this->return_photo_path);
    }
}

