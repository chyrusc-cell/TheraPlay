<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Child;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChildController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $user = $request->user();

        // One child profile per parent (children.user_id is unique).
        if ($user->child()->exists()) {
            return $this->alreadyExists();
        }

        try {
            // The parent always comes from the token, never from the request.
            $child = Child::create([
                'user_id' => $user->id,
                'name' => trim($validated['name']),
            ]);
        } catch (UniqueConstraintViolationException) {
            // Two requests arrived at the same time; the other one won.
            return $this->alreadyExists();
        }

        return response()->json([
            'message' => 'Child profile created.',
            'data' => [
                'child' => [
                    'id' => $child->id,
                    'name' => $child->name,
                    'created_at' => $child->created_at,
                ],
            ],
        ], 201);
    }

    private function alreadyExists(): JsonResponse
    {
        return response()->json([
            'message' => 'A child profile already exists for this account.',
            'code' => 'child_profile_exists',
        ], 422);
    }
}
