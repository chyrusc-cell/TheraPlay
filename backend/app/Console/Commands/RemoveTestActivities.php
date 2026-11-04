<?php

namespace App\Console\Commands;

use App\Models\Activity;
use Illuminate\Console\Command;

/**
 * One-off cleanup of placeholder activities. Each activity is looked up by its
 * EXACT title and must match exactly one row; a missing or ambiguous title is
 * reported and skipped. Deleting also removes that activity's progress records,
 * resources and uploaded files (Activity::purge()) and nothing else.
 *
 *   php artisan activities:remove-test "Memory Match" "Button Practice"
 *   php artisan activities:remove-test "Memory Match" --dry-run
 */
class RemoveTestActivities extends Command
{
    protected $signature = 'activities:remove-test {titles* : Exact activity titles} {--dry-run : Only show what would be removed}';

    protected $description = 'Delete test activities by exact title, with their progress records and files';

    public function handle(): int
    {
        $status = self::SUCCESS;

        foreach ($this->argument('titles') as $title) {
            $matches = Activity::query()->where('title', $title)->get()
                ->filter(fn (Activity $activity) => $activity->title === $title);

            if ($matches->isEmpty()) {
                $this->warn("Not found: \"{$title}\" (nothing removed).");
                $status = self::FAILURE;
                continue;
            }

            if ($matches->count() > 1) {
                $this->error("Ambiguous: \"{$title}\" matches ids ".$matches->pluck('id')->implode(', ').' (nothing removed).');
                $status = self::FAILURE;
                continue;
            }

            $activity = $matches->first();
            $progress = $activity->progressRecords()->count();
            $files = $activity->resources()->count();
            $summary = "id {$activity->id} \"{$title}\" ({$progress} progress record(s), {$files} file(s))";

            if ($this->option('dry-run')) {
                $this->line("Would remove {$summary}.");
                continue;
            }

            $activity->purge();
            $this->info("Removed {$summary}.");
        }

        return $status;
    }
}
