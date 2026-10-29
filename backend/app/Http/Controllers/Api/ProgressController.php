<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ResolvesChild;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProgressController extends Controller
{
    use ResolvesChild;

    public function index(Request $request): JsonResponse
    {
        // Progress belongs to the user's child record. A user who has no
        // child record yet simply has no progress.
        // The selected child (child_id), always one of the user's own.
        $child = $this->resolveChild($request);

        if (! $child) {
            return response()->json(['data' => ['records' => []]]);
        }

        $records = $child->progressRecords()
            ->with('activity.category:id,name')
            ->latest('id')
            ->get()
            ->map(fn ($record) => [
                'id' => $record->id,
                'activity_id' => $record->activity_id,
                'activity_title' => $record->activity?->title,
                'category' => $record->activity?->category?->name,
                'status' => $record->status,
                'started_at' => $record->started_at,
                'completed_at' => $record->completed_at,
            ]);

        return response()->json([
            'data' => ['records' => $records],
        ]);
    }
}
