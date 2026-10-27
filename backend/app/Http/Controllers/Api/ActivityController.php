<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use Illuminate\Http\JsonResponse;

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
            ->orderBy('id')
            ->get();

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
                'image_path' => $activity->image_path,
            ],
        ]);
    }
}