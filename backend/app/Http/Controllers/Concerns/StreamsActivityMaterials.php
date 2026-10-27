<?php

namespace App\Http\Controllers\Concerns;

use App\Models\ActivityResource;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

trait StreamsActivityMaterials
{
    // Sends the stored file as a download. The client never sees the stored
    // path; only the original file name is used in the response.
    protected function streamMaterial(ActivityResource $resource): StreamedResponse
    {
        $disk = Storage::disk(config('filesystems.activity_materials.disk'));

        abort_unless($disk->exists($resource->file_path), 404);

        return $disk->download($resource->file_path, $resource->file_name, [
            'Content-Type' => $resource->file_type ?: 'application/octet-stream',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
