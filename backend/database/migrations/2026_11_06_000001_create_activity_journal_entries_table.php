<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One row per completed SESSION of an activity by one child: the parent's
     * 1-5 rating and journal note. It is a separate table (not a column on
     * activity_progress) because a progress row is reused when the same child
     * completes the same activity again, and a single editable note there would
     * be overwritten by the next session. Existing progress rows are untouched.
     */
    public function up(): void
    {
        Schema::create('activity_journal_entries', function (Blueprint $table) {
            $table->id();

            $table->foreignId('activity_progress_id')
                ->constrained('activity_progress')
                ->cascadeOnDelete();

            $table->foreignId('child_id')
                ->constrained('children')
                ->cascadeOnDelete();

            $table->foreignId('activity_id')
                ->constrained('activities')
                ->cascadeOnDelete();

            $table->unsignedTinyInteger('rating');
            $table->text('note')->nullable();

            // The completion this entry belongs to (activity_progress.completed_at
            // at the time). An undo + re-complete is a new session with a new time.
            $table->timestamp('session_completed_at');

            $table->timestamps();

            $table->unique(['activity_progress_id', 'session_completed_at'], 'journal_one_per_session');
            $table->index(['child_id', 'activity_id', 'session_completed_at'], 'journal_child_activity_session');
            $table->index('session_completed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_journal_entries');
    }
};
