<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\ActivityProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityCompletionController extends Controller
{
    public function store(Request $request, int $id): JsonResponse
    {
        $activity = Activity::query()
            ->where('is_published', true)
            ->findOrFail($id);

        // The child always comes from the logged-in user, never from the request.
        $child = $request->user()->child()->first();

        if (! $child) {
            return response()->json([
                'message' => 'No child profile is set up for this account yet, so progress cannot be recorded.',
                'code' => 'child_profile_required',
            ], 422);
        }

        $record = ActivityProgress::query()
            ->where('child_id', $child->id)
            ->where('activity_id', $activity->id)
            ->latest('id')
            ->first();

        // Repeating the request must not create duplicates or change the
        // original completion time.
        if ($record?->status === 'completed') {
            return response()->json([
                'message' => 'This activity was already completed.',
                'data' => ['record' => $this->format($record)],
            ]);
        }

        $created = ! $record;

        $record ??= new ActivityProgress([
            'child_id' => $child->id,
            'activity_id' => $activity->id,
        ]);

        $record->status = 'completed';
        $record->completed_at = now();
        $record->save();

        return response()->json([
            'message' => 'Activity marked as completed.',
            'data' => ['record' => $this->format($record)],
        ], $created ? 201 : 200);
    }

    private function format(ActivityProgress $record): array
    {
        return [
            'id' => $record->id,
            'activity_id' => $record->activity_id,
            'status' => $record->status,
            'started_at' => $record->started_at,
            'completed_at' => $record->completed_at,
        ];
    }
}
