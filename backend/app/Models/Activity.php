<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Activity extends Model
{
    // Pictures live in this folder of the private disk. image_path is never
    // mass-assignable: only ActivityImageController sets it.
    public const IMAGE_DIRECTORY = 'activity-images';

    protected $fillable = [
        'category_id',
        'created_by',
        'title',
        'description',
        'objective',
        'instructions',
        'materials',
        'difficulty',
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

    // Only paths made by the upload code count (older placeholder values in the
    // column are ignored).
    public function hasPicture(): bool
    {
        return is_string($this->image_path)
            && str_starts_with($this->image_path, self::IMAGE_DIRECTORY.'/');
    }

    // The public picture URL (the route only serves published activities), or
    // null. The stored path itself is never returned.
    public function imageUrl(): ?string
    {
        return $this->hasPicture()
            ? url("/api/activities/{$this->id}/image").'?v='.substr(md5($this->image_path), 0, 8)
            : null;
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
