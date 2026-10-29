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
    public function show(): JsonResponse
    {
        return response()->json(['data' => DeveloperTeam::current()]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30', 'regex:/^[0-9+().\-\s]+$/'],
        ]);

        // Always the same single row.
        $team = DeveloperTeam::query()->find(1) ?? new DeveloperTeam();
        $team->id = 1;
        $team->fill($validated)->save();

        return response()->json([
            'message' => 'Developer team details saved.',
            'data' => DeveloperTeam::current(),
        ]);
    }
}
