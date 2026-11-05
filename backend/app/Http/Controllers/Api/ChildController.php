<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Child;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * A parent's own children. Every route here is for the logged-in parent only
 * (auth:sanctum + role:parent) and every child is looked up among THAT parent's
 * children, so another parent's child is simply "not found". The parent comes
 * from the token, never from the request.
 */
class ChildController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $children = $request->user()->children()
            ->with('conditions:id,name,is_active')
            ->withCount('progressRecords')
            ->orderBy('id')
            ->get()
            ->map(fn (Child $child) => self::format($child));

        return response()->json(['data' => $children]);
    }

    public function store(Request $request): JsonResponse
    {
        // A child profile can only be created once the parent has verified their
        // email address. This is checked here on the server (not only by the app),
        // so calling the API directly, logging out and in, or refreshing cannot
        // get around it.
        if (! $request->user()->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Please verify your email address before creating a child profile. Enter the code we emailed you.',
                'code' => 'email_not_verified',
            ], 403);
        }

        $validated = $request->validate(self::rules());

        // A repeated submission (a double click, a retry, a second tab) of the same
        // child within a minute returns the profile that was just made instead of
        // creating a duplicate. Requests of one parent run one at a time here.
        [$child, $created] = DB::transaction(function () use ($request, $validated) {
            User::whereKey($request->user()->id)->lockForUpdate()->first();

            $name = trim($validated['name']);
            $dob = $validated['date_of_birth'] ?? null;

            $recent = Child::query()
                ->where('user_id', $request->user()->id)
                ->where('name', $name)
                ->when($dob, fn ($query) => $query->whereDate('date_of_birth', $dob), fn ($query) => $query->whereNull('date_of_birth'))
                ->where('created_at', '>=', now()->subMinute())
                ->latest('id')
                ->first();

            if ($recent) {
                return [$recent, false];
            }

            $child = Child::create([
                'user_id' => $request->user()->id,
                'name' => $name,
                'date_of_birth' => $dob,
            ]);

            $child->conditions()->sync($validated['condition_ids'] ?? []);

            return [$child, true];
        });

        return response()->json([
            'message' => $created ? 'Child profile created.' : 'This child profile was already created.',
            'data' => ['child' => self::format($child->load('conditions:id,name,is_active'))],
        ], $created ? 201 : 200);
    }

    public function update(Request $request, int $child): JsonResponse
    {
        $child = $request->user()->children()->findOrFail($child);
        $validated = $request->validate(self::rules());

        DB::transaction(function () use ($child, $validated) {
            $child->update([
                'name' => trim($validated['name']),
                'date_of_birth' => $validated['date_of_birth'] ?? null,
            ]);

            // Conditions that were switched off by an admin are not offered any
            // more but stay attached (history), so they are kept here.
            $kept = $child->conditions()->where('conditions.is_active', false)->pluck('conditions.id')->all();

            $child->conditions()->sync(array_values(array_unique([
                ...($validated['condition_ids'] ?? []),
                ...$kept,
            ])));
        });

        return response()->json([
            'message' => 'Child profile updated.',
            'data' => ['child' => self::format($child->fresh()->load('conditions:id,name,is_active'))],
        ]);
    }

    public function destroy(Request $request, int $child): JsonResponse
    {
        $child = $request->user()->children()->findOrFail($child);

        // progress rows cascade on delete, so a child with history is refused
        // rather than silently erasing it.
        if ($child->progressRecords()->exists()) {
            return response()->json([
                'message' => 'This child has saved activity progress and cannot be deleted.',
                'code' => 'child_has_progress',
            ], 422);
        }

        $child->delete();

        return response()->json(['message' => 'Child profile deleted.']);
    }

    // Shared with registration.
    public static function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', 'regex:/\S/'],
            'date_of_birth' => [
                'nullable',
                'date',
                'before_or_equal:today',
                'after_or_equal:'.now()->subYears(18)->toDateString(),
            ],
            'condition_ids' => ['nullable', 'array', 'max:50'],
            // New selections must be active conditions.
            'condition_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('conditions', 'id')->where('is_active', true),
            ],
        ];
    }

    public static function format(Child $child): array
    {
        return [
            'id' => $child->id,
            'name' => $child->name,
            'date_of_birth' => $child->date_of_birth?->toDateString(),
            'created_at' => $child->created_at,
            'has_progress' => isset($child->progress_records_count)
                ? $child->progress_records_count > 0
                : null,
            'conditions' => $child->relationLoaded('conditions')
                ? $child->conditions->map(fn ($condition) => [
                    'id' => $condition->id,
                    'name' => $condition->name,
                    'is_active' => (bool) $condition->is_active,
                ])->values()
                : [],
        ];
    }
}
