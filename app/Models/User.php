<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'work_area_id',
        'badge_number',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function workArea(): BelongsTo
    {
        return $this->belongsTo(WorkArea::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(InventoryTransaction::class, 'user_id');
    }

    public function approvedTransactions(): HasMany
    {
        return $this->hasMany(InventoryTransaction::class, 'approved_by');
    }

    public function isTknoAdmin(): bool
    {
        return $this->role === 'tkno_admin';
    }

    public function isTko(): bool
    {
        return $this->role === 'tko';
    }

    public function isTkno(): bool
    {
        return $this->role === 'tkno';
    }

    public function canManageItems(): bool
    {
        return in_array($this->role, ['tko', 'tkno_admin'], true);
    }

    public function canApproveForWorkArea(?int $workAreaId): bool
    {
        if ($this->isTknoAdmin()) {
            return true;
        }

        if ($this->isTko() && $workAreaId && (int)$this->work_area_id === (int)$workAreaId) {
            return true;
        }

        return false;
    }
}
