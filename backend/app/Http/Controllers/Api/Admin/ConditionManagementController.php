<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Condition;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Admin-only management of the predefined conditions (routes are protected by
 * ['auth:sanctum', 'role:admin']). There is no delete: a condition that is in use
 * is switched off (is_active = false) instead, which keeps every child's and
 * activity's history and just stops offering it for new selections.
 */
class ConditionManagementController extends Controller
{
    public function index(): JsonResponse
    {
        $conditions = Condition::query()
            ->withCount(['children', 'activities'])
            ->orderBy('name')
            ->get()
            ->map(fn (Condition $condition) => $this->format($condition));

        return response()->json(['data' => $conditions]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'regex:/\S/', 'unique:conditions,name'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $condition = Condition::create([
            'name' => trim($validated['name']),
            'description' => $validated['description'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return response()->json([
            'message' => 'Condition created.',
            'data' => $this->format($condition->loadCount(['children', 'activities'])),
        ], 201);
    }

    public function update(Request $request, Condition $condition): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', 'regex:/\S/', Rule::unique('conditions', 'name')->ignore($condition->id)],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (isset($validated['name'])) {
            $validated['name'] = trim($validated['name']);
        }

        $condition->update($validated);

        return response()->json([
            'message' => 'Condition updated.',
            'data' => $this->format($condition->fresh()->loadCount(['children', 'activities'])),
        ]);
    }

    private function format(Condition $condition): array
    {
        return [
            'id' => $condition->id,
            'name' => $condition->name,
            'description' => $condition->description,
            'is_active' => (bool) $condition->is_active,
            'children_count' => $condition->children_count ?? 0,
            'activities_count' => $condition->activities_count ?? 0,
        ];
    }
}
