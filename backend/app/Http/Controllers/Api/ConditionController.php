<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Condition;
use Illuminate\Http\JsonResponse;

class ConditionController extends Controller
{
    // The conditions a parent can choose from (active ones only). Public and
    // read-only: they are plain names, used on the registration form too.
    public function index(): JsonResponse
    {
        $conditions = Condition::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'description']);

        return response()->json(['data' => $conditions]);
    }
}
