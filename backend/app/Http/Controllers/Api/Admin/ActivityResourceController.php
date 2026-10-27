<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\StreamsActivityMaterials;
use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\ActivityResource;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;
use ZipArchive;

/**
 * Admin-only file materials for an activity. Every route that reaches this
 * controller is protected by ['auth:sanctum', 'role:admin'].
 *
 * Files are stored on a private disk under a random name; the original name
 * is kept only as display text. The text "materials" list on the activity is
 * a separate field and is not touched here.
 */
class ActivityResourceController extends Controller
{
    use StreamsActivityMaterials;

    // Allowed extension => acceptable detected MIME types. The first MIME is
    // the one stored and sent back on download.
    private const TYPES = [
        'pdf' => ['application/pdf'],
        'png' => ['image/png'],
        'jpg' => ['image/jpeg'],
        'txt' => ['text/plain'],
        'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        'pptx' => ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    ];

    // A file inside every real .docx / .pptx package.
    private const OOXML_MARKER = [
        'docx' => 'word/document.xml',
        'pptx' => 'ppt/presentation.xml',
    ];

    public function store(Request $request, Activity $activity): JsonResponse
    {
        $maxKb = (int) config('filesystems.activity_materials.max_kb');
        $maxFiles = (int) config('filesystems.activity_materials.max_files');

        $request->validate([
            'files' => ['required', 'array', 'min:1', "max:{$maxFiles}"],
            'files.*' => [
                'required',
                'file',
                "max:{$maxKb}",
                function (string $attribute, mixed $file, Closure $fail) {
                    if ($file instanceof UploadedFile && $this->detectExtension($file) === null) {
                        $fail('"'.$file->getClientOriginalName().'" is not a supported file. Use PDF, DOCX, PPTX, PNG, JPG or TXT.');
                    }
                },
            ],
        ], [
            'files.*.max' => 'Each file must be '.round($maxKb / 1024, 1).' MB or smaller.',
            'files.*.uploaded' => 'A file could not be uploaded. It may be larger than the server allows.',
        ]);

        $disk = Storage::disk(config('filesystems.activity_materials.disk'));
        $directory = "activity-materials/{$activity->id}";
        $stored = [];

        try {
            $resources = DB::transaction(function () use ($request, $activity, $disk, $directory, &$stored) {
                $created = [];

                foreach ($request->file('files') as $file) {
                    $extension = $this->detectExtension($file);
                    $path = $disk->putFileAs($directory, $file, Str::uuid().'.'.$extension);

                    if ($path === false) {
                        throw new RuntimeException('The file could not be stored.');
                    }

                    $stored[] = $path;

                    $displayName = $this->displayName($file, $extension);

                    $created[] = $activity->resources()->create([
                        'title' => pathinfo($displayName, PATHINFO_FILENAME) ?: $displayName,
                        'file_name' => $displayName,
                        'file_path' => $path,
                        'file_type' => self::TYPES[$extension][0],
                    ]);
                }

                return $created;
            });
        } catch (Throwable $e) {
            // Do not leave files behind when the database save failed.
            foreach ($stored as $path) {
                $disk->delete($path);
            }

            throw $e;
        }

        return response()->json([
            'message' => count($resources) === 1 ? 'File uploaded.' : count($resources).' files uploaded.',
            'data' => [
                'resources' => collect($resources)->map(fn ($r) => $this->format($r))->all(),
            ],
        ], 201);
    }

    public function destroy(Activity $activity, ActivityResource $resource): JsonResponse
    {
        $path = $resource->file_path;

        $resource->delete();

        // Only remove the file when no other record still points at it.
        if (! ActivityResource::where('file_path', $path)->exists()) {
            Storage::disk(config('filesystems.activity_materials.disk'))->delete($path);
        }

        return response()->json(['message' => 'File removed.']);
    }

    // Admins may download files of any activity, including unpublished ones.
    public function download(Activity $activity, ActivityResource $resource): StreamedResponse
    {
        return $this->streamMaterial($resource);
    }

    /**
     * Returns the canonical extension when the file is a supported type, based
     * on its extension AND the content detected by the server (never the
     * browser-supplied MIME type), or null when it is not allowed.
     */
    private function detectExtension(UploadedFile $file): ?string
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $extension = $extension === 'jpeg' ? 'jpg' : $extension;

        if (! isset(self::TYPES[$extension])) {
            return null;
        }

        $mime = $file->getMimeType();

        if (in_array($mime, self::TYPES[$extension], true)) {
            return $extension;
        }

        // Office files are zip packages and are often detected as plain zips.
        if (isset(self::OOXML_MARKER[$extension])
            && in_array($mime, ['application/zip', 'application/x-zip-compressed'], true)
            && $this->isOfficePackage($file, self::OOXML_MARKER[$extension])) {
            return $extension;
        }

        return null;
    }

    private function isOfficePackage(UploadedFile $file, string $marker): bool
    {
        if (! class_exists(ZipArchive::class)) {
            return false;
        }

        $zip = new ZipArchive();

        if ($zip->open($file->getRealPath(), ZipArchive::RDONLY) !== true) {
            return false;
        }

        $valid = $zip->locateName('[Content_Types].xml') !== false
            && $zip->locateName($marker) !== false;

        $zip->close();

        return $valid;
    }

    // Original name for display only: no folders, no control characters.
    private function displayName(UploadedFile $file, string $extension): string
    {
        $name = basename(str_replace('\\', '/', $file->getClientOriginalName()));
        $name = preg_replace('/[\x00-\x1F\x7F]/u', '', $name) ?? '';
        $name = mb_substr(trim($name), 0, 200);

        return $name !== '' ? $name : "file.{$extension}";
    }

    private function format(ActivityResource $resource): array
    {
        return [
            'id' => $resource->id,
            'file_name' => $resource->file_name,
            'file_type' => $resource->file_type,
        ];
    }
}
