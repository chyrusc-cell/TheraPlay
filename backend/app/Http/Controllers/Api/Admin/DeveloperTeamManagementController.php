<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DeveloperTeam;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin-only editing of the Developer Team card (routes are protected by
 * ['auth:sanctum', 'role:admin']). It is one settings row, kept separate from
 * the professional contacts.
 */
class DeveloperTeamManagementController extends Controller
{
    private const PHONE_RULE = 'regex:/^[0-9+().\-\s]+$/';

    public function show(): JsonResponse
    {
        return response()->json(['data' => DeveloperTeam::current()]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            // The lists are the real input. The single email / phone fields are
            // still accepted (older clients) and become a one-item list.
            'emails' => ['nullable', 'array', 'max:10'],
            'emails.*' => ['required', 'string', 'email', 'max:255', 'distinct:ignore_case'],
            'phones' => ['nullable', 'array', 'max:10'],
            'phones.*' => ['required', 'string', 'max:30', self::PHONE_RULE, 'distinct'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30', self::PHONE_RULE],
        ]);

        $emails = $this->clean($validated['emails'] ?? (isset($validated['email']) ? [$validated['email']] : []));
        $phones = $this->clean($validated['phones'] ?? (isset($validated['phone']) ? [$validated['phone']] : []));

        $values = [
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            // The first entry of each list, for older code.
            'email' => $emails[0] ?? null,
            'phone' => $phones[0] ?? null,
        ];

        // Before the migration is run only the first entry can be stored.
        if (DeveloperTeam::supportsLists()) {
            $values['emails'] = $emails;
            $values['phones'] = $phones;
        }

        // Always the same single row.
        $team = DeveloperTeam::query()->find(1) ?? new DeveloperTeam();
        $team->id = 1;
        $team->fill($values)->save();

        return response()->json([
            'message' => 'Developer team details saved.',
            'data' => DeveloperTeam::current(),
        ]);
    }

    private function clean(array $values): array
    {
        return array_values(array_filter(array_map('trim', $values), fn ($value) => $value !== ''));
    }
}
