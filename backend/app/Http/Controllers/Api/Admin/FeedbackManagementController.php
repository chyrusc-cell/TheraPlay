<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Feedback;
use Illuminate\Http\JsonResponse;

/**
 * Admin-only, read-only view of submitted feedback. Protected by
 * ['auth:sanctum', 'role:admin'] in routes/api.php.
 */
class FeedbackManagementController extends Controller
{
    public function index(): JsonResponse
    {
        // Only id, name and email are loaded for the submitter, so nothing
        // else about the account can leave the server.
        $feedback = Feedback::query()
            ->with('user:id,name,email')
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Feedback $item) => [
                'id' => $item->id,
                'message' => $item->message,
                'rating' => $item->rating,
                'created_at' => $item->created_at,
                // null when the account no longer exists
                'user' => $item->user ? [
                    'id' => $item->user->id,
                    'name' => $item->user->name,
                    'email' => $item->user->email,
                ] : null,
            ]);

        return response()->json(['data' => $feedback]);
    }
}
