<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ActivityController extends Controller
{
    public function index(): JsonResponse
    {
        $activities = Activity::query()
            ->where('is_published', true)
            ->select([
                'id',
                'category_id',
                'title',
                'description',
                'objective',
                'difficulty',
                'image_path',
            ])
            ->with('category:id,name')
            ->orderBy('id')
            ->get()
            ->map(fn (Activity $activity) => [
                'id' => $activity->id,
                'category_id' => $activity->category_id,
                'category' => $activity->category?->name,
                'title' => $activity->title,
                'description' => $activity->description,
                'objective' => $activity->objective,
                'difficulty' => $activity->difficulty,
                'image_url' => $activity->imageUrl(),
            ]);

        return response()->json([
            'data' => $activities,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $activity = Activity::query()
            ->where('is_published', true)
            ->with('category:id,name', 'resources')
            ->findOrFail($id);

        return response()->json([
            'data' => [
                'id' => $activity->id,
                'title' => $activity->title,
                'category' => $activity->category?->name,
                'difficulty' => $activity->difficulty,
                'description' => $activity->description,
                'objective' => $activity->objective,
                'instructions' => $activity->instructions,
                'materials' => $activity->materials,
                // Uploaded files (published activities only): display metadata.
                'resources' => $activity->resources->map(fn ($resource) => [
                    'id' => $resource->id,
                    'file_name' => $resource->file_name,
                    'file_type' => $resource->file_type,
                ])->values(),
                'image_url' => $activity->imageUrl(),
            ],
        ]);
    }

    // The picture of a PUBLISHED activity. Drafts (and activities without a
    // picture) are 404, so a draft's picture is never reachable by its URL.
    public function image(Activity $activity): StreamedResponse
    {
        $disk = Storage::disk(config('filesystems.activity_materials.disk'));

        abort_unless(
            $activity->is_published
                && $activity->hasPicture()
                && $disk->exists($activity->image_path),
            404
        );

        return $disk->response($activity->image_path, null, [
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}
