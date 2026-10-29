<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeveloperTeam;
use Illuminate\Http\JsonResponse;

class DeveloperTeamController extends Controller
{
    // Public and read-only: the card on the Contact Us page.
    public function show(): JsonResponse
    {
        return response()->json(['data' => DeveloperTeam::current()]);
    }
}
