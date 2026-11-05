<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityResource extends Model
{
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
