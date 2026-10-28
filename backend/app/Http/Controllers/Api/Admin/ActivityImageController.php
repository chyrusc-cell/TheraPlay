<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\ValidatesImageUploads;
use App\Http\Controllers\Controller;
use App\Models\Activity;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The picture of an activity (one per activity, stored in activities.image_path).
 * Admin-only: routes are protected by ['auth:sanctum', 'role:admin']. The path is
 * always generated here, never taken from the request. The public (published
 * only) route is ActivityController::image.
 */
class ActivityImageController extends Controller
{
    use ValidatesImageUploads;

    // Activity pictures: at most 5 MB (the server's PHP limit may be lower).
    private const MAX_KB = 5120;

    public function store(Request $request, Activity $activity): JsonResponse
    {
        $request->validate([
            'image' => [
                'required',
                'file',
                'max:'.self::MAX_KB,
                function (string $attribute, mixed $file, Closure $fail) {
                    if (! $file instanceof UploadedFile || $this->imageExtension($file) === null) {
                        $fail('The picture must be a JPG, PNG or WebP image.');
                    }
                },
            ],
        ], [
            'image.max' => 'The picture must be '.round(self::MAX_KB / 1024).' MB or smaller.',
            'image.uploaded' => 'The picture could not be uploaded. It may be larger than the server allows.',
        ]);

        $file = $request->file('image');
        $disk = $this->disk();

        $path = $disk->putFileAs(Activity::IMAGE_DIRECTORY, $file, Str::uuid().'.'.$this->imageExtension($file));

        if ($path === false) {
            return response()->json(['message' => 'The picture could not be stored.'], 500);
        }

        $old = $activity->image_path;
        $activity->forceFill(['image_path' => $path])->save();

        $this->deleteStored($old);

        return response()->json([
            'message' => 'Picture saved.',
            'data' => ['image_url' => $activity->imageUrl()],
        ]);
    }

    public function destroy(Activity $activity): JsonResponse
    {
        $old = $activity->image_path;

        if ($old !== null) {
            $activity->forceFill(['image_path' => null])->save();
            $this->deleteStored($old);
        }

        return response()->json([
            'message' => 'Picture removed.',
            'data' => ['image_url' => null],
        ]);
    }

    // Lets the admin form show the picture of a draft (the public route 404s
    // for drafts). Needs the admin's token, so the page fetches it with it.
    public function show(Activity $activity): StreamedResponse
    {
        abort_unless($activity->hasPicture() && $this->disk()->exists($activity->image_path), 404);

        return $this->disk()->response($activity->image_path, null, [
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    private function disk()
    {
        return Storage::disk(config('filesystems.activity_materials.disk'));
    }

    // Only files inside the pictures folder are ever deleted.
    private function deleteStored(?string $path): void
    {
        if ($path !== null && str_starts_with($path, Activity::IMAGE_DIRECTORY.'/')) {
            $this->disk()->delete($path);
        }
    }
}
