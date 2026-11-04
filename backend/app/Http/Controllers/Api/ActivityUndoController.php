<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityProgress;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Undo an accidental "Mark as Completed".
 *
 * The record is NOT deleted: its row, its activity/child link and its start time
 * stay, only the completion is taken back (status goes back to what it was before
 * completing: "in_progress" if it had been started, otherwise "not_started", and
 * completed_at is cleared). The record must belong to one of the logged-in
 * parent's own children; anything else (another parent's record, an unknown id)
 * is the same 404, so ids cannot be probed.
 */
class ActivityUndoController extends Controller
{
    public function undo(Request $request, int $id): JsonResponse
    {
        [$record, $changed] = DB::transaction(function () use ($request, $id) {
            $record = ActivityProgress::query()
                ->whereHas('child', fn ($query) => $query->where('user_id', $request->user()->id))
                ->lockForUpdate()
                ->findOrFail($id);

            // Repeating the request (a double click, a second tab) changes nothing.
            if ($record->status !== 'completed') {
                return [$record, false];
            }

            $record->status = $record->started_at ? 'in_progress' : 'not_started';
            $record->completed_at = null;
            $record->save();

            return [$record, true];
        });

        return response()->json([
            'message' => $changed
                ? 'Completion undone. The activity is no longer marked as completed.'
                : 'This activity is not marked as completed.',
            'data' => ['record' => [
                'id' => $record->id,
                'activity_id' => $record->activity_id,
                'status' => $record->status,
                'started_at' => $record->started_at,
                'completed_at' => $record->completed_at,
            ]],
        ]);
    }
}
