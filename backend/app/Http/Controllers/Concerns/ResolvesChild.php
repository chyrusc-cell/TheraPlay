<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Child;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Finds the child a request is about, ALWAYS among the logged-in user's own
 * children. A child_id from the request (body or query) is only a choice between
 * the user's children: anyone else's child is "not found" (404), never revealed.
 * Without a child_id a parent with exactly one child gets that child, a parent
 * with none gets null, and a parent with several must say which one (422).
 */
trait ResolvesChild
{
    protected function resolveChild(Request $request): ?Child
    {
        $user = $request->user();
        $childId = $request->input('child_id', $request->query('child_id'));

        if ($childId !== null && $childId !== '') {
            abort_unless(is_scalar($childId) && ctype_digit((string) $childId), 404, 'Child not found.');

            return $user->children()->whereKey((int) $childId)->firstOrFail();
        }

        $children = $user->children()->limit(2)->get();

        if ($children->count() > 1) {
            throw ValidationException::withMessages([
                'child_id' => ['Choose which child this is for.'],
            ]);
        }

        return $children->first();
    }
}
