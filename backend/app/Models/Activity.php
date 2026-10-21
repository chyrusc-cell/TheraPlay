<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Activity extends Model
{
    protected $fillable = [
        'category_id',
        'created_by',
        'title',
        'description',
        'objective',
        'instructions',
        'materials',
        'difficulty',
        'image_path',
        'is_published',
    ];

    protected function casts(): array
    {
        return [
            'instructions' => 'array',
            'materials' => 'array',
            'is_published' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function resources(): HasMany
    {
        return $this->hasMany(ActivityResource::class);
    }

    public function progressRecords(): HasMany
    {
        return $this->hasMany(ActivityProgress::class);
    }
}
