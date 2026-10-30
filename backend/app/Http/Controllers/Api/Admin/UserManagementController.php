<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\MailDelivery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Throwable;

/**
 * Admin-only account management. Every route that reaches this controller is
 * protected by ['auth:sanctum', 'role:admin'] in routes/api.php.
 *
 * Safeguards:
 *  - the role is never taken from the request: store() always creates an
 *    administrator, and roles only change through promote() and demote()
 *  - the last administrator can be neither demoted nor deleted; the checks run
 *    inside a transaction that locks the administrator rows, so two requests at
 *    once cannot remove the last two administrators
 *  - an admin cannot delete or demote their own account here
 *  - accounts that own a child profile cannot be deleted, because
 *    children.user_id cascades and would erase the children's progress (the same
 *    rule as the self-service deletion in ProfileController)
 *  - a new or changed email address is never marked verified by the request
 */
class UserManagementController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::query()
            ->withCount('children')
            ->orderBy('id')
            ->get()
            ->map(fn (User $user) => $this->format($user));

        return response()->json(['data' => $users]);
    }

    public function show(User $user): JsonResponse
    {
        $user->loadCount('children');

        return response()->json(['data' => $this->format($user)]);
    }

    // Creates an ADMINISTRATOR account. Whatever "role" a client sends is ignored.
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'regex:/\S/'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)],
            'contact_number' => ['nullable', 'string', 'max:30'],
        ]);

        // Fields are copied one by one (nothing is mass-assigned); the password is
        // hashed by the User model's "hashed" cast; the role is set here, by the
        // server; email_verified_at stays empty until the person opens the link.
        $user = new User();
        $user->name = trim($validated['name']);
        $user->email = $validated['email'];
        $user->password = $validated['password'];
        $user->role = 'admin';
        $user->contact_number = $validated['contact_number'] ?? null;
        $user->save();

        $sent = $this->sendVerification($user);

        return response()->json([
            'message' => 'Administrator account created.',
            'email_verification' => [
                'sent' => $sent,
                'delivery_available' => MailDelivery::isConfigured(),
            ],
            'data' => $this->format($user->loadCount('children')),
        ], 201);
    }

    // Name and email only. Roles change through promote() / demote().
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', 'regex:/\S/'],
            'email' => [
                'sometimes', 'required', 'string', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
            ],
        ]);

        $emailChanges = isset($validated['email'])
            && mb_strtolower($validated['email']) !== mb_strtolower($user->email);

        $user->fill(collect($validated)->only(['name', 'email'])->all());

        if ($emailChanges) {
            // The old address's verification does not carry over to the new one.
            $user->email_verified_at = null;
        }

        $user->save();

        if ($emailChanges) {
            $user->clearPendingEmail();
            $this->sendVerification($user);
        }

        return response()->json([
            'message' => 'Account updated.',
            'data' => $this->format($user->loadCount('children')),
        ]);
    }

    public function promote(User $user): JsonResponse
    {
        return DB::transaction(function () use ($user) {
            $this->lockAdmins();
            $target = User::query()->lockForUpdate()->findOrFail($user->id);

            if ($target->role === 'admin') {
                return $this->blocked('already_admin', 'This account is already an administrator.');
            }

            $target->forceFill(['role' => 'admin'])->save();

            // The role is read from the database on every request, so the change
            // applies at once. Existing logins are revoked so the person signs in
            // again under the new role.
            $target->tokens()->delete();

            return response()->json([
                'message' => 'Account promoted to administrator.',
                'data' => $this->format($target->loadCount('children')),
            ]);
        });
    }

    public function demote(Request $request, User $user): JsonResponse
    {
        return DB::transaction(function () use ($request, $user) {
            $adminIds = $this->lockAdmins();
            $target = User::query()->lockForUpdate()->findOrFail($user->id);

            if ($target->is($request->user())) {
                return $this->blocked('cannot_demote_self', 'You cannot remove your own administrator role.');
            }

            if ($target->role !== 'admin') {
                return $this->blocked('not_admin', 'This account is not an administrator.');
            }

            if (count($adminIds) <= 1) {
                return $this->blocked('last_admin', 'This is the last administrator. Promote another account first.');
            }

            $target->forceFill(['role' => 'parent'])->save();
            $target->tokens()->delete();

            return response()->json([
                'message' => 'Administrator role removed.',
                'data' => $this->format($target->loadCount('children')),
            ]);
        });
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $photo = null;

        $blocked = DB::transaction(function () use ($request, $user, &$photo) {
            $adminIds = $this->lockAdmins();
            $target = User::query()->lockForUpdate()->findOrFail($user->id);

            if ($target->is($request->user())) {
                return $this->blocked('cannot_delete_self', 'You cannot delete your own account here.');
            }

            if ($target->role === 'admin' && count($adminIds) <= 1) {
                return $this->blocked('last_admin', 'The last administrator cannot be deleted.');
            }

            // children.user_id cascades to the child's progress, so deleting would
            // silently erase it. Refuse instead of guessing.
            if ($target->children()->exists()) {
                return $this->blocked(
                    'has_child_profile',
                    'This account has child profiles with saved progress and cannot be deleted. Their data is never erased automatically.'
                );
            }

            // Logins are not linked by a foreign key, so remove them explicitly,
            // together with anything else waiting for this account. Feedback and
            // created activities are kept (their user columns become null).
            $target->tokens()->delete();
            PasswordBroker::deleteToken($target);
            $target->clearPendingEmail();
            $photo = $target->hasPhoto() ? $target->photo_path : null;
            $target->delete();

            return null;
        });

        if ($blocked) {
            return $blocked;
        }

        if ($photo) {
            Storage::disk(config('filesystems.activity_materials.disk'))->delete($photo);
        }

        return response()->json(['message' => 'Account deleted.']);
    }

    // Locks every administrator row for the rest of the transaction and returns
    // their ids, so "is this the last administrator?" cannot change underneath us.
    private function lockAdmins(): array
    {
        return User::query()
            ->where('role', 'admin')
            ->lockForUpdate()
            ->pluck('id')
            ->all();
    }

    // A failed mail never fails the request; the status is reported instead.
    private function sendVerification(User $user): bool
    {
        try {
            $user->sendEmailVerificationNotification();

            return true;
        } catch (Throwable $e) {
            Log::warning('Verification email could not be sent for an admin-managed account.', [
                'user_id' => $user->id,
                'error' => class_basename($e),
            ]);

            return false;
        }
    }

    private function blocked(string $code, string $message): JsonResponse
    {
        return response()->json([
            'message' => $message,
            'code' => $code,
        ], 409);
    }

    // Only what is needed to manage accounts; never passwords, tokens or the
    // stored photo path.
    private function format(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'created_at' => $user->created_at,
            'email_verified' => $user->hasVerifiedEmail(),
            'email_verified_at' => $user->email_verified_at,
            'children_count' => (int) ($user->children_count ?? 0),
            'has_child_profile' => (int) ($user->children_count ?? 0) > 0,
        ];
    }
}
