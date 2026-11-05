<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityJournalEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin-only, read-only list of the parents' session ratings and journal notes
 * (Activity Feedback on the admin dashboard). Newest session first, paginated.
 * Admins cannot create or edit entries; only the parent's name, the child's name,
 * the activity title, rating, note and dates leave the server (no emails).
 */
class ActivityFeedbackController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min(max((int) $request->query('per_page', 10), 1), 50);

        $page = ActivityJournalEntry::query()
            ->with(['activity:id,title', 'child:id,name,user_id', 'child.user:id,name'])
            ->orderByDesc('session_completed_at')
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json([
            'data' => $page->getCollection()->map(fn (ActivityJournalEntry $entry) => [
                'id' => $entry->id,
                'rating' => $entry->rating,
                'note' => $entry->note,
                'session_completed_at' => $entry->session_completed_at,
                'created_at' => $entry->created_at,
                'user' => $entry->child?->user ? ['id' => $entry->child->user->id, 'name' => $entry->child->user->name] : null,
                'child' => $entry->child ? ['id' => $entry->child->id, 'name' => $entry->child->name] : null,
                'activity' => $entry->activity ? ['id' => $entry->activity->id, 'title' => $entry->activity->title] : null,
            ])->values(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }
}
