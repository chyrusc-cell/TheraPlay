<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ActivityController extends Controller
{
    // The published activities. With ?child_id=N (and the parent's token) the list
    // is limited to what suits THAT child: activities assigned to at least one of
    // the child's ACTIVE conditions, or marked suitable for all conditions. A child
    // with no active conditions gets an empty list (meta.requires_conditions). The
    // child must be one of the caller's own (anything else is 404). Without
    // child_id this stays the full public list.
    public function index(Request $request): JsonResponse
    {
        $query = Activity::query()
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
            ->orderBy('id');

        $meta = null;

        if ($request->filled('child_id')) {
            $user = $request->user('sanctum');
            $childId = $request->query('child_id');

            abort_unless(
                $user && $user->role === 'parent' && is_scalar($childId) && ctype_digit((string) $childId),
                404,
                'Child not found.'
            );

            $child = $user->children()->whereKey((int) $childId)->firstOrFail();

            $conditionIds = $child->conditions()
                ->where('conditions.is_active', true)
                ->pluck('conditions.id')
                ->all();

            if ($conditionIds === []) {
                return response()->json([
                    'data' => [],
                    'meta' => ['child_id' => $child->id, 'requires_conditions' => true],
                ]);
            }

            $query->where(function ($q) use ($conditionIds) {
                $q->where('is_for_all_conditions', true)
                    ->orWhereHas('conditions', fn ($c) => $c->whereIn('conditions.id', $conditionIds));
            });

            $meta = ['child_id' => $child->id, 'requires_conditions' => false];
        }

        $activities = $query
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

        return response()->json(array_filter([
            'data' => $activities,
            'meta' => $meta,
        ], fn ($value) => $value !== null));
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
