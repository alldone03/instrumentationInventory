<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Item extends Model
{
    use HasFactory;

    protected $fillable = [
        'mn_code',
        'item_name',
        'sap_description',
        'item_category',
        'type',
        'unit',
        'sap_classification',
        'sap_status',
        'reorder_point',
        'min_lot_size',
        'system_stock',
        'actual_stock',
        'last_stock_opname_at',
        'location_id',
        'owner_work_area_id',
        'notes',
    ];

    protected $casts = [
        'reorder_point' => 'integer',
        'min_lot_size' => 'integer',
        'system_stock' => 'integer',
        'actual_stock' => 'integer',
        'last_stock_opname_at' => 'datetime',
    ];

    protected $appends = [
        'primary_image_url',
    ];

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function ownerWorkArea(): BelongsTo
    {
        return $this->belongsTo(WorkArea::class, 'owner_work_area_id');
    }

    public function images(): HasMany
    {
        return $this->hasMany(ItemImage::class);
    }

    public function primaryImage(): HasOne
    {
        return $this->hasOne(ItemImage::class)->where('is_primary', true);
    }

    public function transactionItems(): HasMany
    {
        return $this->hasMany(InventoryTransactionItem::class);
    }

    public function getPrimaryImageUrlAttribute(): ?string
    {
        $primary = $this->images->firstWhere('is_primary', true) ?? $this->images->first();
        return $primary ? $primary->image_url : null;
    }

    /**
     * Determines whether taking/borrowing this item requires approval by the owner area's supervisor.
     */
    public function requiresApprovalFor(?User $user): bool
    {
        if (!$user) {
            return false;
        }

        // Super Admin is auto-approved
        if ($user->isTknoAdmin()) {
            return false;
        }

        // Shared / Umum items are free to take without cross-area approval
        $ownerAreaName = $this->ownerWorkArea ? strtolower($this->ownerWorkArea->name) : '';
        if (str_contains($ownerAreaName, 'umum') || str_contains($ownerAreaName, 'shared')) {
            return false;
        }

        // If the user's work area matches the item's owner work area
        if ($user->work_area_id && (int)$this->owner_work_area_id === (int)$user->work_area_id) {
            return false;
        }

        return true;
    }

    public function scopeFilter(Builder $query, array $filters): Builder
    {
        return $query
            ->when($filters['search'] ?? null, function (Builder $query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('item_name', 'like', "%{$search}%")
                        ->orWhere('sap_description', 'like', "%{$search}%")
                        ->orWhere('mn_code', 'like', "%{$search}%");
                });
            })
            ->when($filters['type'] ?? null, function (Builder $query, $type) {
                $query->where('type', $type);
            })
            ->when($filters['location_id'] ?? null, function (Builder $query, $locationId) {
                $query->where('location_id', $locationId);
            })
            ->when($filters['owner_work_area_id'] ?? null, function (Builder $query, $areaId) {
                $query->where('owner_work_area_id', $areaId);
            })
            ->when($filters['item_category'] ?? null, function (Builder $query, $category) {
                $query->where('item_category', $category);
            });
    }
}

