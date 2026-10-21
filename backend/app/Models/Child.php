<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Child extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'date_of_birth',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function conditions(): BelongsToMany
    {
        return $this->belongsToMany(Condition::class)
            ->withTimestamps();
    }

    public function progressRecords(): HasMany
    {
        return $this->hasMany(ActivityProgress::class);
    }
}
