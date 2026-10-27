<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Feedback;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FeedbackController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        // Only these fields are read from the request. A submitted user_id is
        // not validated, so it is ignored.
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:5000'],
            'rating' => ['nullable', 'integer', 'between:1,5'],
        ]);

        $feedback = new Feedback($validated);
        $feedback->user_id = $request->user()->id;
        $feedback->save();

        return response()->json([
            'message' => 'Thank you for your feedback.',
            'data' => [
                'feedback' => [
                    'id' => $feedback->id,
                    'message' => $feedback->message,
                    'rating' => $feedback->rating,
                    'created_at' => $feedback->created_at,
                ],
            ],
        ], 201);
    }
}
