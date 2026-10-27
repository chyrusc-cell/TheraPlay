<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\StreamsActivityMaterials;
use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\ActivityResource;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ActivityMaterialController extends Controller
{
    use StreamsActivityMaterials;

    // Same rule as the public activity pages: only PUBLISHED activities.
    // A draft's files answer 404, so their existence is not revealed either.
    public function download(Activity $activity, ActivityResource $resource): StreamedResponse
    {
        abort_unless($activity->is_published, 404);

        return $this->streamMaterial($resource);
    }
}
