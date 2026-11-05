<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityResource extends Model
{
    // Pictures that can be shown on a card and previewed in the viewer.
    public const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

    // Every type an upload may be stored as (see ActivityResourceController).
    public const SERVABLE_TYPES = [
        'application/pdf',
        'text/plain',
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/gif',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ];

    protected $fillable = [
        'activity_id',
        'title',
        'file_name',
        'file_path',
        'file_type',
        'description',
    ];

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }
}
