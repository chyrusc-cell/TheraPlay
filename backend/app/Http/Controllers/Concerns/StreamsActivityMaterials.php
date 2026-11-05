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

        // Always an attachment (never rendered by the server's own origin), with
        // a content type taken from the allow-list only: anything else (HTML, SVG,
        // scripts, old rows with odd values) is sent as opaque bytes.
        $type = in_array($resource->file_type, ActivityResource::SERVABLE_TYPES, true)
            ? $resource->file_type
            : 'application/octet-stream';

        return $disk->download($resource->file_path, $resource->file_name, [
            'Content-Type' => $type,
            'X-Content-Type-Options' => 'nosniff',
            'Content-Security-Policy' => "default-src 'none'; sandbox",
            'Cache-Control' => 'private, max-age=300',
        ]);
    }
}
