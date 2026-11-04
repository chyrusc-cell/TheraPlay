<?php

namespace App\Console\Commands;

use App\Models\Activity;
use App\Models\Category;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

/**
 * Imports the curated activity library (database/data/activity-library.json) from
 * an extracted copy of TheraPlay_Activities_Organized.zip: one activity per file,
 * the original file attached unchanged.
 *
 * Safe to repeat: an activity with the same title in the same category is never
 * created twice, and an attachment with the same file name is never added twice
 * (a missing attachment of an existing activity is the only thing it repairs).
 * It never creates categories (they must already exist), never touches
 * conditions, users, children or progress, and creates activities as unpublished
 * drafts like the admin API does. Use --dry-run to see what would happen.
 */
class ImportActivityLibrary extends Command
{
    protected $signature = 'activities:import-library
                            {source : Folder with the category sub-folders (the extracted ZIP)}
                            {--data= : Metadata file (default database/data/activity-library.json)}
                            {--dry-run : Check everything and report, change nothing}';

    protected $description = 'Import the curated activity library with its original attachments (idempotent; unpublished drafts)';

    // Allowed extension => detected MIME (same content-based rule as the admin upload).
    private const TYPES = [
        'pdf' => 'application/pdf',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
    ];

    public function handle(): int
    {
        $source = rtrim((string) $this->argument('source'), '/\\');
        $dataFile = $this->option('data') ?: database_path('data/activity-library.json');
        $dry = (bool) $this->option('dry-run');

        if (! is_dir($source)) {
            $this->error("Source folder not found: {$source}");

            return self::FAILURE;
        }

        $data = json_decode((string) @file_get_contents($dataFile), true);

        if (! is_array($data) || empty($data['activities'])) {
            $this->error("Cannot read the metadata file: {$dataFile}");

            return self::FAILURE;
        }

        $entries = $data['activities'];
        $categories = Category::pluck('id', 'name');
        $maxBytes = (int) config('filesystems.activity_materials.max_kb') * 1024;
        $problems = [];

        // 1. Validate everything first, so nothing is half imported.
        foreach ($entries as $index => $entry) {
            $label = ($entry['category'] ?? '?').' / '.($entry['title'] ?? '?');

            if (! in_array($entry['category'] ?? null, Category::REQUIRED_NAMES, true) || ! isset($categories[$entry['category']])) {
                $problems[] = "{$label}: the category does not exist (categories are never created here).";
            }

            if (! in_array($entry['difficulty'] ?? null, ['Easy', 'Medium', 'Hard'], true)) {
                $problems[] = "{$label}: difficulty must be Easy, Medium or Hard.";
            }

            if (empty($entry['instructions']) || ! is_array($entry['instructions'])) {
                $problems[] = "{$label}: at least one instruction is required.";
            }

            $path = $source.DIRECTORY_SEPARATOR.($entry['category'] ?? '').DIRECTORY_SEPARATOR.($entry['file'] ?? '');
            $extension = strtolower(pathinfo((string) ($entry['file'] ?? ''), PATHINFO_EXTENSION));

            if (! is_file($path)) {
                $problems[] = "{$label}: file not found ({$entry['file']}).";
            } elseif (! isset(self::TYPES[$extension]) || mime_content_type($path) !== self::TYPES[$extension]) {
                $problems[] = "{$label}: the file content is not a real ".strtoupper($extension).' file.';
            } elseif (filesize($path) > $maxBytes) {
                $problems[] = "{$label}: the file is larger than the attachment limit.";
            }
        }

        if ($problems !== []) {
            foreach ($problems as $problem) {
                $this->error($problem);
            }
            $this->error('Nothing was imported.');

            return self::FAILURE;
        }

        $admin = User::where('email', config('theraplay.admin.email'))->where('role', 'admin')->first()
            ?? User::where('role', 'admin')->orderBy('id')->first();

        if (! $admin) {
            $this->error('No administrator account exists to own the activities. Run "php artisan admin:initialize" first.');

            return self::FAILURE;
        }

        // 2. Import.
        $disk = Storage::disk(config('filesystems.activity_materials.disk'));
        $stats = ['created' => 0, 'skipped' => 0, 'attachment_repaired' => 0, 'failed' => 0];
        $perCategory = [];

        foreach ($entries as $entry) {
            $existing = Activity::whereRaw('LOWER(title) = ?', [mb_strtolower($entry['title'])])
                ->where('category_id', $categories[$entry['category']])
                ->first();

            $path = $source.DIRECTORY_SEPARATOR.$entry['category'].DIRECTORY_SEPARATOR.$entry['file'];
            $extension = strtolower(pathinfo($entry['file'], PATHINFO_EXTENSION));

            if ($existing && $existing->resources()->where('file_name', $entry['file'])->exists()) {
                $stats['skipped']++;
                $this->line("skip      {$entry['category']} / {$entry['title']} (already imported)");

                continue;
            }

            if ($dry) {
                $this->line(($existing ? 'would attach ' : 'would create ')."{$entry['category']} / {$entry['title']} [{$entry['difficulty']}]");
                $stats[$existing ? 'attachment_repaired' : 'created']++;
                $perCategory[$entry['category']] = ($perCategory[$entry['category']] ?? 0) + 1;

                continue;
            }

            $stored = null;

            try {
                DB::transaction(function () use ($entry, $existing, $categories, $admin, $path, $extension, $disk, &$stored, &$activity) {
                    $activity = $existing ?? new Activity([
                        'category_id' => $categories[$entry['category']],
                        'title' => $entry['title'],
                        'description' => $entry['description'] ?? null,
                        'objective' => $entry['objective'] ?? null,
                        'instructions' => array_values($entry['instructions']),
                        'materials' => array_values($entry['materials'] ?? []),
                        'difficulty' => $entry['difficulty'],
                    ]);

                    if (! $existing) {
                        $activity->created_by = $admin->id;
                        $activity->is_published = false;
                        $activity->save();
                    }

                    $stored = "activity-materials/{$activity->id}/".Str::uuid().'.'.$extension;
                    $disk->put($stored, file_get_contents($path));

                    $activity->resources()->create([
                        'title' => pathinfo($entry['file'], PATHINFO_FILENAME),
                        'file_name' => $entry['file'],
                        'file_path' => $stored,
                        'file_type' => self::TYPES[$extension],
                    ]);
                });

                $stats[$existing ? 'attachment_repaired' : 'created']++;
                $perCategory[$entry['category']] = ($perCategory[$entry['category']] ?? 0) + 1;
                $this->line(($existing ? 'attached  ' : 'created   ')."{$entry['category']} / {$entry['title']} [{$entry['difficulty']}]");
            } catch (Throwable $e) {
                // Do not leave a file behind when the database save failed.
                if ($stored !== null) {
                    $disk->delete($stored);
                }
                $stats['failed']++;
                $this->error("FAILED    {$entry['category']} / {$entry['title']}: ".class_basename($e));
            }
        }

        $this->newLine();
        $this->info(($dry ? '[dry run] ' : '').'created '.$stats['created'].', already imported '.$stats['skipped'].', attachments repaired '.$stats['attachment_repaired'].', failed '.$stats['failed'].'.');

        foreach ($perCategory as $name => $count) {
            $this->line("  {$name}: {$count}");
        }

        return $stats['failed'] > 0 ? self::FAILURE : self::SUCCESS;
    }
}
