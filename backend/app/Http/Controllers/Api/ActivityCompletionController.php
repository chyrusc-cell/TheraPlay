<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\ActivityProgress;
use App\Models\Child;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

        // Requests for the same child run one at a time here, so two quick
        // clicks cannot both see "not completed yet" and insert two records.
        [$record, $created, $alreadyCompleted] = DB::transaction(function () use ($child, $activity) {
            Child::whereKey($child->id)->lockForUpdate()->first();

            $record = ActivityProgress::query()
                ->where('child_id', $child->id)
                ->where('activity_id', $activity->id)
                ->latest('id')
                ->first();

            // Repeating the request keeps the original completion time.
            if ($record?->status === 'completed') {
                return [$record, false, true];
            }

            $created = ! $record;

            $record ??= new ActivityProgress([
                'child_id' => $child->id,
                'activity_id' => $activity->id,
            ]);

            $record->status = 'completed';
            $record->completed_at = now();
            $record->save();

            return [$record, $created, false];
        });

        if ($alreadyCompleted) {
            return response()->json([
                'message' => 'This activity was already completed.',
                'data' => ['record' => $this->format($record)],
            ]);
        }

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
