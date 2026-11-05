<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A parent's rating and observation for ONE completed session of an activity by
 * one child. Rows are created only by ActivityJournalController (ownership and
 * the session come from the server); nothing here is mass assignable.
 */
class ActivityJournalEntry extends Model
{
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'session_completed_at' => 'datetime',
        ];
    }

    public function progress(): BelongsTo
    {
        return $this->belongsTo(ActivityProgress::class, 'activity_progress_id');
    }

    public function child(): BelongsTo
    {
        return $this->belongsTo(Child::class);
    }

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }
}
