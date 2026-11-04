<?php

namespace App\Support;

use App\Models\ActivityResource;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;
use Throwable;

/**
 * Thumbnails for PDF attachments: a JPEG of PAGE 1, rendered by tools/pdf-thumbnail.mjs
 * (Node, pdf.js + a prebuilt canvas; no Ghostscript/Imagick needed).
 *
 * Storage: the same private disk as the attachments, in a separate folder with a
 * predictable name, "activity-thumbnails/{activity_id}/{resource_id}.jpg". Nothing
 * is stored in the database: a thumbnail exists when its file exists. The original
 * attachment is only read, never changed or replaced.
 *
 * Generation never throws: a bad PDF, a missing file or a missing Node simply means
 * "no thumbnail" and the card shows its placeholder. The script gets absolute paths
 * built here from database values (never user input) and no shell is involved.
 */
class PdfThumbnail
{
    public const DIRECTORY = 'activity-thumbnails';

    public static function path(ActivityResource $resource): string
    {
        return self::DIRECTORY.'/'.(int) $resource->activity_id.'/'.(int) $resource->id.'.jpg';
    }

    private static function disk()
    {
        return Storage::disk(config('filesystems.activity_materials.disk'));
    }

    public static function exists(ActivityResource $resource): bool
    {
        return $resource->file_type === 'application/pdf' && self::disk()->exists(self::path($resource));
    }

    public static function delete(ActivityResource $resource): void
    {
        self::disk()->delete(self::path($resource));
    }

    /**
     * @return string created | exists | failed | missing_source | not_pdf
     */
    public static function generate(ActivityResource $resource, bool $force = false): string
    {
        if ($resource->file_type !== 'application/pdf') {
            return 'not_pdf';
        }

        $disk = self::disk();
        $target = self::path($resource);

        if (! $force && $disk->exists($target)) {
            return 'exists';
        }

        if (! $disk->exists($resource->file_path)) {
            return 'missing_source';
        }

        $output = tempnam(sys_get_temp_dir(), 'thumb');
        $copy = null;

        try {
            try {
                $source = $disk->path($resource->file_path);
            } catch (Throwable) {
                // A disk without local paths: work on a temporary copy.
                $copy = tempnam(sys_get_temp_dir(), 'pdf');
                file_put_contents($copy, $disk->get($resource->file_path));
                $source = $copy;
            }

            $process = new Process(
                [
                    (string) config('filesystems.activity_materials.thumbnail.node', 'node'),
                    config('filesystems.activity_materials.thumbnail.script'),
                    $source,
                    $output,
                    (string) config('filesystems.activity_materials.thumbnail.width', 600),
                ],
                base_path(),
                null,
                null,
                (float) config('filesystems.activity_materials.thumbnail.timeout', 60),
            );
            $process->run();

            if (! $process->isSuccessful() || ! is_file($output) || filesize($output) < 200 || mime_content_type($output) !== 'image/jpeg') {
                // The reason is logged without any file path.
                Log::warning('PDF thumbnail could not be created.', [
                    'resource_id' => $resource->id,
                    'reason' => mb_substr(preg_replace('/\s+/', ' ', trim($process->getErrorOutput())), 0, 160),
                ]);

                return 'failed';
            }

            $disk->put($target, (string) file_get_contents($output));

            return 'created';
        } catch (Throwable $e) {
            Log::warning('PDF thumbnail could not be created.', [
                'resource_id' => $resource->id,
                'error' => class_basename($e),
            ]);

            return 'failed';
        } finally {
            @unlink($output);
            if ($copy) {
                @unlink($copy);
            }
        }
    }
}
