<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Admin-only management of the activity categories (routes are protected by
 * ['auth:sanctum', 'role:admin']). The categories are the fixed set in
 * Category::REQUIRED_NAMES: none can be added, renamed or deleted; only the
 * description is editable. A stray (non-required) category that no activity
 * uses may still be deleted.
 */
class CategoryManagementController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = Category::query()
            ->withCount('activities')
            ->orderBy('name')
            ->get()
            ->map(fn (Category $category) => $this->format($category));

        return response()->json(['data' => $categories]);
    }

    // The six categories are a fixed set (Category::REQUIRED_NAMES), so a new
    // category cannot be added through the API or the admin screen.
    public function store(Request $request): JsonResponse
    {
        return response()->json([
            'message' => 'The activity categories are fixed. New categories cannot be added.',
            'code' => 'categories_fixed',
        ], 403);
    }

    /** Only the description can change; a required category keeps its name. */
    public function update(Request $request, Category $category): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        if (isset($validated['name']) && $validated['name'] !== $category->name) {
            throw ValidationException::withMessages([
                'name' => 'Category names cannot be changed. You can edit the description.',
            ]);
        }

        unset($validated['name']);

        $category->update($validated);

        return response()->json([
            'message' => 'Category updated.',
            'data' => $this->format($category->fresh()->loadCount('activities')),
        ]);
    }

    public function destroy(Category $category): JsonResponse
    {
        if (Category::isRequiredName($category->name)) {
            return response()->json([
                'message' => 'This is one of the required categories and cannot be deleted.',
                'code' => 'category_required',
            ], 409);
        }

        $count = $category->activities()->count();

        if ($count > 0) {
            return response()->json([
                'message' => 'This category is used by '.$count.' '.($count === 1 ? 'activity' : 'activities').' and cannot be deleted. Move those activities to one of the required categories first.',
            ], 409);
        }

        $category->delete();

        return response()->json(['message' => 'Category deleted.']);
    }

    private function format(Category $category): array
    {
        return [
            'id' => $category->id,
            'name' => $category->name,
            'description' => $category->description,
            'activities_count' => $category->activities_count ?? 0,
        ];
    }
}
