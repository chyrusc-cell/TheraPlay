<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\ActivityResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

/**
 * Admin-only activity management. Every route that reaches this controller is
 * protected by ['auth:sanctum', 'role:admin'] in routes/api.php.
 *
 * destroy() deletes an activity PERMANENTLY, together with the children's
 * progress records that belong to it. Unpublish hides an activity without
 * losing anything.
 */
class ActivityManagementController extends Controller
{
    public function index(): JsonResponse
    {
        // Unlike the public list, this includes unpublished (draft) activities.
        $activities = Activity::query()
            ->with('category:id,name', 'resources', 'conditions:id')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Activity $activity) => $this->format($activity));

        return response()->json(['data' => $activities]);
    }

    public function show(Activity $activity): JsonResponse
    {
        return response()->json(['data' => $this->format($activity)]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules(creating: true));

        // Only validated fields are used, so a client cannot set created_by or
        // is_published. New activities start as unpublished drafts.
        $conditionIds = $validated['condition_ids'] ?? [];
        unset($validated['condition_ids']);

        $activity = new Activity($validated);
        $activity->created_by = $request->user()->id;
        $activity->save();
        $activity->conditions()->sync($conditionIds);

        return response()->json([
            'message' => 'Activity created.',
            'data' => $this->format($activity->refresh()),
        ], 201);
    }

    public function update(Request $request, Activity $activity): JsonResponse
    {
        $validated = $request->validate($this->rules(creating: false));

        // created_by and is_published are not in the validated data, so
        // ownership and publication cannot change through an update.
        $conditionIds = $validated['condition_ids'] ?? null;
        unset($validated['condition_ids']);

        $activity->update($validated);

        if ($conditionIds !== null) {
            $activity->conditions()->sync($conditionIds);
        }

        return response()->json([
            'message' => 'Activity updated.',
            'data' => $this->format($activity->refresh()),
        ]);
    }

    /**
     * Permanently deletes one activity and everything that belongs to it: the
     * children's progress records for THIS activity, its resources (rows and
     * uploaded files), its picture and its condition links. The database rows go
     * in one transaction (any failure rolls all of it back); the files are removed
     * only after it commits, so a rollback never loses a file. Other activities,
     * children and their other progress are not touched.
     */
    public function destroy(Activity $activity): JsonResponse
    {
        $disk = Storage::disk(config('filesystems.activity_materials.disk'));
        $imagePath = $activity->image_path;
        $filePaths = $activity->resources()->pluck('file_path')->unique()->all();

        DB::transaction(function () use ($activity) {
            $activity->progressRecords()->delete();
            $activity->resources()->delete();
            $activity->conditions()->detach();
            $activity->delete();
        });

        if ($imagePath !== null && str_starts_with($imagePath, Activity::IMAGE_DIRECTORY.'/')) {
            $disk->delete($imagePath);
        }

        foreach ($filePaths as $path) {
            // A file is only removed when no other resource still points at it.
            if (! ActivityResource::where('file_path', $path)->exists()) {
                $disk->delete($path);
            }
        }

        return response()->json(['message' => 'Activity deleted.']);
    }

    public function publish(Activity $activity): JsonResponse
    {
        return $this->setPublished($activity, true, 'Activity published.');
    }

    public function unpublish(Activity $activity): JsonResponse
    {
        return $this->setPublished($activity, false, 'Activity unpublished.');
    }

    private function setPublished(Activity $activity, bool $published, string $message): JsonResponse
    {
        $activity->update(['is_published' => $published]);

        return response()->json([
            'message' => $message,
            'data' => $this->format($activity->refresh()),
        ]);
    }

    /**
     * On create the main fields are required; on update (PUT or PATCH) a field
     * is only checked when it is sent, so partial updates work.
     */
    private function rules(bool $creating): array
    {
        $required = $creating ? ['required'] : ['sometimes', 'required'];

        return [
            'title' => [...$required, 'string', 'max:255'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'description' => ['nullable', 'string', 'max:5000'],
            'objective' => ['nullable', 'string', 'max:2000'],
            'instructions' => [...$required, 'array', 'min:1'],
            'instructions.*' => ['required', 'string', 'max:500'],
            'materials' => [$creating ? 'present' : 'sometimes', 'array'],
            'materials.*' => ['required', 'string', 'max:255'],
            'difficulty' => ['sometimes', 'string', Rule::in(['Easy', 'Medium', 'Hard'])],
            // Which conditions this activity is relevant to (existing ids only).
            'condition_ids' => ['sometimes', 'array', 'max:100'],
            'condition_ids.*' => ['integer', 'distinct', 'exists:conditions,id'],
            'is_for_all_conditions' => ['sometimes', 'boolean'],
        ];
    }

    private function format(Activity $activity): array
    {
        $activity->loadMissing('category:id,name', 'resources', 'conditions:id');

        return [
            'id' => $activity->id,
            'title' => $activity->title,
            'category_id' => $activity->category_id,
            'category' => $activity->category?->name,
            'description' => $activity->description,
            'objective' => $activity->objective,
            'instructions' => $activity->instructions,
            'materials' => $activity->materials,
            // Uploaded files: display metadata only, never the stored path.
            'resources' => $activity->resources->map(fn ($resource) => [
                'id' => $resource->id,
                'file_name' => $resource->file_name,
                'file_type' => $resource->file_type,
            ])->values(),
            'difficulty' => $activity->difficulty,
            'condition_ids' => $activity->conditions->pluck('id')->values(),
            'is_for_all_conditions' => $activity->is_for_all_conditions,
            'image_url' => $activity->imageUrl(),
            'is_published' => $activity->is_published,
            'created_by' => $activity->created_by,
            'created_at' => $activity->created_at,
            'updated_at' => $activity->updated_at,
        ];
    }
}
