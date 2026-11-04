<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\StreamsActivityMaterials;
use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\ActivityResource;
use App\Support\PdfThumbnail;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ActivityMaterialController extends Controller
{
    use StreamsActivityMaterials;

    // Same rule as the public activity pages: only PUBLISHED activities.
    // A draft's files answer 404, so their existence is not revealed either.
    public function download(Activity $activity, ActivityResource $resource): StreamedResponse
    {
        abort_unless($activity->is_published && $activity->archived_at === null, 404);

        return $this->streamMaterial($resource);
    }

    // The generated card picture (page 1) of a PDF attachment. Same rule as the
    // download: published, non-archived activities only, otherwise 404. It is only
    // ever the generated JPEG (never the original, never an arbitrary file), and
    // only for a PDF attachment that has one.
    public function thumbnail(Activity $activity, ActivityResource $resource): StreamedResponse
    {
        abort_unless($activity->is_published && $activity->archived_at === null, 404);
        abort_unless(PdfThumbnail::exists($resource), 404);

        return Storage::disk(config('filesystems.activity_materials.disk'))->response(
            PdfThumbnail::path($resource),
            'thumbnail.jpg',
            [
                'Content-Type' => 'image/jpeg',
                'X-Content-Type-Options' => 'nosniff',
                'Content-Security-Policy' => "default-src 'none'; sandbox",
                'Cache-Control' => 'private, max-age=300',
            ]
        );
    }
}
