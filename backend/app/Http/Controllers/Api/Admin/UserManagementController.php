<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Admin-only account management. Every route that reaches this controller is
 * protected by ['auth:sanctum', 'role:admin'] in routes/api.php.
 *
 * Safeguards:
 *  - only the supported roles can be assigned (validated, never mass-assigned)
 *  - the last administrator can be neither demoted nor deleted
 *  - an admin cannot delete their own account here
 *  - accounts that own a child profile cannot be deleted, because
 *    children.user_id cascades and would erase the child's progress
 */
class UserManagementController extends Controller
{
    private const ROLES = ['parent', 'admin'];

    public function index(): JsonResponse
    {
        $users = User::query()
            ->withExists('child')
            ->orderBy('id')
            ->get()
            ->map(fn (User $user) => $this->format($user));

        return response()->json(['data' => $users]);
    }

    public function show(User $user): JsonResponse
    {
        $user->loadExists('child');

        return response()->json(['data' => $this->format($user)]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)],
            'role' => ['required', Rule::in(self::ROLES)],
            'contact_number' => ['nullable', 'string', 'max:30'],
        ]);

        // Fields are copied one by one; the password is hashed by the User
        // model's "hashed" cast.
        $user = new User();
        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->password = $validated['password'];
        $user->role = $validated['role'];
        $user->contact_number = $validated['contact_number'] ?? null;
        $user->save();

        return response()->json([
            'message' => 'Account created.',
            'data' => $this->format($user->loadExists('child')),
        ], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        // Passwords and other fields cannot be changed here.
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes', 'required', 'string', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
            'role' => ['sometimes', 'required', Rule::in(self::ROLES)],
        ]);

        $roleChanges = isset($validated['role']) && $validated['role'] !== $user->role;

        if ($roleChanges && $user->role === 'admin' && $this->adminCount() <= 1) {
            return $this->blocked(
                'last_admin',
                'This is the last administrator. Promote another account first.'
            );
        }

        $user->fill(collect($validated)->only(['name', 'email'])->all());

        if ($roleChanges) {
            $user->role = $validated['role'];
        }

        $user->save();

        // The role is read from the database on every request, so the change
        // applies immediately. Existing logins are also revoked so the person
        // signs in again under the new role.
        if ($roleChanges) {
            $user->tokens()->delete();
        }

        return response()->json([
            'message' => 'Account updated.',
            'data' => $this->format($user->loadExists('child')),
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->is($request->user())) {
            return $this->blocked(
                'cannot_delete_self',
                'You cannot delete your own account.'
            );
        }

        if ($user->role === 'admin' && $this->adminCount() <= 1) {
            return $this->blocked(
                'last_admin',
                'The last administrator cannot be deleted.'
            );
        }

        // children.user_id cascades to the child's progress, so deleting would
        // silently erase it. Refuse instead of guessing.
        if ($user->child()->exists()) {
            return $this->blocked(
                'has_child_profile',
                'This account has a child profile with saved progress and cannot be deleted.'
            );
        }

        // Tokens are not linked by a foreign key, so remove them explicitly.
        // Feedback and created activities are kept (their user columns become null).
        $user->tokens()->delete();
        $photo = $user->hasPhoto() ? $user->photo_path : null;
        $user->delete();

        if ($photo) {
            \Illuminate\Support\Facades\Storage::disk(config('filesystems.activity_materials.disk'))->delete($photo);
        }

        return response()->json(['message' => 'Account deleted.']);
    }

    private function adminCount(): int
    {
        return User::where('role', 'admin')->count();
    }

    private function blocked(string $code, string $message): JsonResponse
    {
        return response()->json([
            'message' => $message,
            'code' => $code,
        ], 409);
    }

    // Only what is needed to manage accounts; never passwords or tokens.
    private function format(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'created_at' => $user->created_at,
            'has_child_profile' => (bool) $user->child_exists,
        ];
    }
}
