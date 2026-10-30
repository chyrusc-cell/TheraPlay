<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Admin-only management of the activity categories (routes are protected by
 * ['auth:sanctum', 'role:admin']). A category that still has activities cannot be
 * deleted, so no activity is ever left without the category it was given; rename
 * it or move its activities first. Names are unique ignoring letter case.
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

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'regex:/\S/'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $name = trim($validated['name']);
        $this->assertNameIsFree($name);

        $category = Category::create([
            'name' => $name,
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json([
            'message' => 'Category created.',
            'data' => $this->format($category->loadCount('activities')),
        ], 201);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', 'regex:/\S/'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        if (isset($validated['name'])) {
            $validated['name'] = trim($validated['name']);
            $this->assertNameIsFree($validated['name'], $category->id);
        }

        $category->update($validated);

        return response()->json([
            'message' => 'Category updated.',
            'data' => $this->format($category->fresh()->loadCount('activities')),
        ]);
    }

    public function destroy(Category $category): JsonResponse
    {
        $count = $category->activities()->count();

        if ($count > 0) {
            return response()->json([
                'message' => 'This category is used by '.$count.' '.($count === 1 ? 'activity' : 'activities').' and cannot be deleted. Rename it, or move those activities to another category first.',
            ], 409);
        }

        $category->delete();

        return response()->json(['message' => 'Category deleted.']);
    }

    /** The unique column is case sensitive on some databases, so check it by hand. */
    private function assertNameIsFree(string $name, ?int $ignoreId = null): void
    {
        $taken = Category::query()
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->exists();

        if ($taken) {
            throw ValidationException::withMessages([
                'name' => 'A category with this name already exists.',
            ]);
        }
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
