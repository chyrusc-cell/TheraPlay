<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\UploadedFile;

/**
 * Shared check for uploaded pictures (contact photos, activity pictures).
 * The type comes from the file's real content, never from its name or the
 * MIME type the client claims, and the file must decode as an image.
 */
trait ValidatesImageUploads
{
    protected function imageExtension(UploadedFile $file): ?string
    {
        if (! $file->isValid()) {
            return null;
        }

        $extension = match ($file->getMimeType()) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            default => null,
        };

        if ($extension === null || @getimagesize($file->getRealPath()) === false) {
            return null;
        }

        return $extension;
    }
}
