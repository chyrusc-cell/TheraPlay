<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\ChildController;
use App\Models\Child;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class RegisterController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:30'],
            'password' => [
                'required',
                'confirmed',
                Password::min(8),
            ],
            // The first child (the sign-up form asks for it). Optional for API
            // clients that register only the account.
            'child' => ['sometimes', 'array'],
            // required only when a child is sent at all.
            'child.name' => array_merge(['required_with:child'], array_slice(ChildController::rules()['name'], 1)),
            'child.date_of_birth' => ChildController::rules()['date_of_birth'],
            'child.condition_ids' => ChildController::rules()['condition_ids'],
            'child.condition_ids.*' => ChildController::rules()['condition_ids.*'],
        ]);

        // Parent and first child are saved together or not at all.
        $user = DB::transaction(function () use ($validated) {
        $user = User::create([
            'name' => trim(
                $validated['first_name'] . ' ' . $validated['last_name']
            ),
            'email' => $validated['email'],
            'contact_number' => $validated['phone'],
            'password' => Hash::make($validated['password']),
            'role' => 'parent',
        ]);

        if (isset($validated['child'])) {
            $child = Child::create([
                'user_id' => $user->id,
                'name' => trim($validated['child']['name']),
                'date_of_birth' => $validated['child']['date_of_birth'] ?? null,
            ]);

            $child->conditions()->sync($validated['child']['condition_ids'] ?? []);
        }

        return $user;
        });

        return response()->json([
            'message' => 'Registration successful.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'contact_number' => $user->contact_number,
                'role' => $user->role,
            ],
        ], 201);
    }
}
