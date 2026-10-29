<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ValidatesImageUploads;
use App\Http\Controllers\Controller;
use App\Models\User;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

/**
 * The logged-in user's OWN profile picture (parents and admins alike). There is
 * no user id in any of these routes: the account always comes from the token,
 * so nobody can change another account's picture. Files are stored privately and
 * only the owner can read them back.
 */
class ProfilePhotoController extends Controller
{
    use ValidatesImageUploads;

    // At most 2 MB (the usual PHP upload limit).
    private const MAX_KB = 2048;

    public function show(Request $request): StreamedResponse
    {
        $user = $request->user();

        abort_unless($user->hasPhoto() && $this->disk()->exists($user->photo_path), 404);

        return $this->disk()->response($user->photo_path, null, [
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => [
                'bail',
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
            'photo.max' => 'The picture must be '.round(self::MAX_KB / 1024).' MB or smaller.',
            'photo.uploaded' => 'The picture could not be uploaded. It may be larger than the server allows.',
        ]);

        /** @var User $user */
        $user = $request->user();
        $file = $request->file('photo');

        $path = $this->disk()->putFileAs(User::PHOTO_DIRECTORY, $file, Str::uuid().'.'.$this->imageExtension($file));

        if ($path === false) {
            return response()->json(['message' => 'The picture could not be stored.'], 500);
        }

        $old = $user->photo_path;
        // Only the picture column changes (never the name, role or password).
        try {
            $user->forceFill(['photo_path' => $path])->save();
        } catch (Throwable $e) {
            // Don't leave the new file behind if the account could not be updated.
            $this->disk()->delete($path);

            throw $e;
        }

        $this->deleteStored($old);

        return response()->json([
            'message' => 'Profile picture saved.',
            'data' => ['photo_url' => $user->fresh()->photo_url],
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $old = $user->photo_path;

        if ($old !== null) {
            $user->forceFill(['photo_path' => null])->save();
            $this->deleteStored($old);
        }

        return response()->json([
            'message' => 'Profile picture removed.',
            'data' => ['photo_url' => null],
        ]);
    }

    private function disk()
    {
        return Storage::disk(config('filesystems.activity_materials.disk'));
    }

    // Only files inside the profile pictures folder are ever deleted.
    private function deleteStored(?string $path): void
    {
        if ($path !== null && str_starts_with($path, User::PHOTO_DIRECTORY.'/')) {
            $this->disk()->delete($path);
        }
    }
}
