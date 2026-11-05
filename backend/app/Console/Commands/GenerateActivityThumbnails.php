<?php

namespace App\Console\Commands;

use App\Models\ActivityResource;
use App\Support\PdfThumbnail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Creates the card thumbnails (page 1) for PDF attachments that do not have one
 * yet. Safe to repeat: existing thumbnails are kept unless --force is given.
 * Originals are never touched.
 */
class GenerateActivityThumbnails extends Command
{
    protected $signature = 'activities:generate-thumbnails {--force : Recreate thumbnails that already exist} {--dry-run : Only report what would be done}';

    protected $description = 'Generate card thumbnails from page 1 of PDF attachments (images use their original file)';

    public function handle(): int
    {
        $stats = ['created' => 0, 'exists' => 0, 'failed' => 0, 'missing_source' => 0];
        $images = 0;

        foreach (ActivityResource::orderBy('id')->cursor() as $resource) {
            if (in_array($resource->file_type, ActivityResource::IMAGE_TYPES, true)) {
                $images++;

                continue;
            }

            if ($resource->file_type !== 'application/pdf') {
                continue;
            }

            if ($this->option('dry-run')) {
                $stats[PdfThumbnail::exists($resource) && ! $this->option('force') ? 'exists' : 'created']++;

                continue;
            }

            $result = PdfThumbnail::generate($resource, (bool) $this->option('force'));
            $stats[$result] = ($stats[$result] ?? 0) + 1;

            if ($result === 'failed' || $result === 'missing_source') {
                $this->warn("{$result}: resource #{$resource->id} ({$resource->file_name})");
            }
        }

        $disk = Storage::disk(config('filesystems.activity_materials.disk'));
        $bytes = collect($disk->allFiles(PdfThumbnail::DIRECTORY))->sum(fn ($f) => $disk->size($f));

        $this->info(($this->option('dry-run') ? '[dry run] ' : '')."PDF thumbnails: created {$stats['created']}, already there {$stats['exists']}, failed {$stats['failed']}, missing source {$stats['missing_source']}. Image attachments (use their original): {$images}.");
        $this->line('Thumbnail storage: '.PdfThumbnail::DIRECTORY.'/ ('.round($bytes / 1024, 1).' KB)');

        return ($stats['failed'] + $stats['missing_source']) > 0 ? self::FAILURE : self::SUCCESS;
    }
}
