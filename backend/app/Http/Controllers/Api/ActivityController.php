<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use Illuminate\Http\JsonResponse;

class ActivityController extends Controller
{
    public function index(): JsonResponse
    {
        $activities = Activity::query()
            ->where('is_published', true)
            ->select([
                'id',
                'category_id',
                'title',
                'description',
                'objective',
                'difficulty',
                'image_path',
            ])
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => $activities,
        ]);
    }
}