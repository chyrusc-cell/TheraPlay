<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

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
        'is_for_all_conditions',
    ];

    protected function casts(): array
    {
        return [
            'instructions' => 'array',
            'materials' => 'array',
            'is_published' => 'boolean',
            'archived_at' => 'datetime',
            'archived_was_published' => 'boolean',
            'is_for_all_conditions' => 'boolean',
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

    /**
     * The card picture to use when there is no dedicated one: the first attached
     * file (lowest id) that is a supported image type. PDFs and other documents
     * never count. Needs the resources relation (load it to avoid extra queries).
     * The URL is the public download route, which only serves published,
     * non-archived activities.
     */
    public function attachmentImageUrl(): ?string
    {
        $resource = $this->resources
            ->sortBy('id')
            ->first(fn (ActivityResource $r) => in_array($r->file_type, ActivityResource::IMAGE_TYPES, true));

        return $resource
            ? url("/api/activities/{$this->id}/resources/{$resource->id}/download")
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

    // The conditions this activity is relevant to (see is_for_all_conditions too).
    public function conditions(): BelongsToMany
    {
        return $this->belongsToMany(Condition::class, 'activity_condition')
            ->withTimestamps();
    }

    public function resources(): HasMany
    {
        return $this->hasMany(ActivityResource::class);
    }

    public function progressRecords(): HasMany
    {
        return $this->hasMany(ActivityProgress::class);
    }

    /**
     * Permanently deletes this activity and everything that belongs to it: the
     * children's progress records for THIS activity, its resources (rows and
     * uploaded files), its picture and its condition links. The database rows go
     * in one transaction (any failure rolls all of it back); the files are removed
     * only after it commits, so a rollback never loses a file. Other activities,
     * children and their other progress are not touched.
     */
    public function purge(): void
    {
        $disk = Storage::disk(config('filesystems.activity_materials.disk'));
        $imagePath = $this->image_path;
        $filePaths = $this->resources()->pluck('file_path')->unique()->all();

        DB::transaction(function () {
            $this->progressRecords()->delete();
            $this->resources()->delete();
            $this->conditions()->detach();
            $this->delete();
        });

        if ($imagePath !== null
            && str_starts_with($imagePath, self::IMAGE_DIRECTORY.'/')
            && ! self::where('image_path', $imagePath)->exists()) {
            $disk->delete($imagePath);
        }

        foreach ($filePaths as $path) {
            // A file is only removed when no other resource still points at it.
            if (! ActivityResource::where('file_path', $path)->exists()) {
                $disk->delete($path);
            }
        }
    }
}
