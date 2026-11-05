<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ResolvesChild;
use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\ActivityJournalEntry;
use App\Models\ActivityProgress;
use App\Models\Child;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * The session journal: a 1-5 rating of how helpful the activity was plus the
 * parent's observations, saved for one completed session of one child. Both routes
 * are parent-only; entries are looked up through the caller's own children, so
 * another parent's progress record or child is the same 404.
 */
class ActivityJournalController extends Controller
{
    use ResolvesChild;

    public const NOTE_MAX = 5000;

    // POST /progress/{progress}/journal (verified parents only)
    public function store(Request $request, int $progress): JsonResponse
    {
        $validated = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'note' => ['nullable', 'string', 'max:'.self::NOTE_MAX],
        ], [
            'rating.required' => 'Please choose a rating from 1 to 5 stars.',
            'rating.integer' => 'Please choose a rating from 1 to 5 stars.',
            'rating.between' => 'Please choose a rating from 1 to 5 stars.',
            'note.max' => 'Your note is too long (at most '.self::NOTE_MAX.' characters).',
        ]);

        $note = isset($validated['note']) ? trim($validated['note']) : '';

        [$entry, $status] = DB::transaction(function () use ($request, $progress, $validated, $note) {
            $record = ActivityProgress::query()
                ->whereHas('child', fn ($query) => $query->where('user_id', $request->user()->id))
                ->lockForUpdate()
                ->findOrFail($progress);

            // The journal belongs to a completion that exists right now.
            if ($record->status !== 'completed' || ! $record->completed_at) {
                return [null, 'not_completed'];
            }

            // ONE journal entry per child and activity, however many times the activity is
            // undone and completed again. Requests for one child run one at a time.
            Child::whereKey($record->child_id)->lockForUpdate()->first();

            $exists = ActivityJournalEntry::query()
                ->where('child_id', $record->child_id)
                ->where('activity_id', $record->activity_id)
                ->exists();

            if ($exists) {
                return [null, 'exists'];
            }

            $entry = new ActivityJournalEntry;
            $entry->activity_progress_id = $record->id;
            $entry->child_id = $record->child_id;
            $entry->activity_id = $record->activity_id;
            $entry->rating = (int) $validated['rating'];
            $entry->note = $note === '' ? null : $note;
            $entry->session_completed_at = $record->completed_at;
            $entry->save();

            return [$entry, 'created'];
        });

        if ($status === 'not_completed') {
            return response()->json([
                'message' => 'This activity is not marked as completed, so a journal entry cannot be saved for it.',
                'code' => 'not_completed',
            ], 409);
        }

        if ($status === 'exists') {
            return response()->json([
                'message' => 'This activity already has a journal entry. Edit or delete it instead.',
                'code' => 'journal_exists',
            ], 409);
        }

        return response()->json([
            'message' => 'Your journal entry was saved.',
            'data' => ['entry' => self::format($entry)],
        ], 201);
    }

    // GET /activities/{id}/journal?child_id= : the selected child's entries for
    // this activity, newest session first.
    public function index(Request $request, int $id): JsonResponse
    {
        $activity = Activity::query()->whereKey($id)->firstOrFail();
        $child = $this->resolveChild($request);

        $entries = $child
            ? ActivityJournalEntry::query()
                ->where('child_id', $child->id)
                ->where('activity_id', $activity->id)
                ->orderByDesc('session_completed_at')
                ->orderByDesc('id')
                ->limit(200)
                ->get()
                ->map(fn (ActivityJournalEntry $entry) => self::format($entry))
                ->values()
            : [];

        return response()->json(['data' => $entries]);
    }

    // PUT /journal/{entry}: the parent edits the rating/note of their OWN child's entry.
    // The session (progress record, date) never changes.
    public function update(Request $request, int $entry): JsonResponse
    {
        $validated = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'note' => ['nullable', 'string', 'max:'.self::NOTE_MAX],
        ], [
            'rating.required' => 'Please choose a rating from 1 to 5 stars.',
            'rating.integer' => 'Please choose a rating from 1 to 5 stars.',
            'rating.between' => 'Please choose a rating from 1 to 5 stars.',
            'note.max' => 'Your note is too long (at most '.self::NOTE_MAX.' characters).',
        ]);

        $record = $this->ownEntry($request, $entry);
        $note = isset($validated['note']) ? trim($validated['note']) : '';

        $record->rating = (int) $validated['rating'];
        $record->note = $note === '' ? null : $note;
        $record->save();

        return response()->json([
            'message' => 'Your journal entry was updated.',
            'data' => ['entry' => self::format($record)],
        ]);
    }

    // DELETE /journal/{entry}: removes only that one session's entry.
    public function destroy(Request $request, int $entry): JsonResponse
    {
        $this->ownEntry($request, $entry)->delete();

        return response()->json(['message' => 'Your journal entry was deleted.']);
    }

    // Another parent's or an unknown entry is the same 404.
    private function ownEntry(Request $request, int $id): ActivityJournalEntry
    {
        return ActivityJournalEntry::query()
            ->whereHas('child', fn ($query) => $query->where('user_id', $request->user()->id))
            ->findOrFail($id);
    }

    public static function format(ActivityJournalEntry $entry): array
    {
        return [
            'id' => $entry->id,
            'progress_id' => $entry->activity_progress_id,
            'child_id' => $entry->child_id,
            'activity_id' => $entry->activity_id,
            'rating' => $entry->rating,
            'note' => $entry->note,
            'session_completed_at' => $entry->session_completed_at,
            'created_at' => $entry->created_at,
        ];
    }
}
