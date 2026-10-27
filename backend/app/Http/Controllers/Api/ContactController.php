<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProfessionalContact;
use Illuminate\Http\JsonResponse;

class ContactController extends Controller
{
    // Public and read-only: the list shown on the Contact Us page.
    public function index(): JsonResponse
    {
        $contacts = ProfessionalContact::query()
            ->select(['id', 'name', 'title', 'email', 'phone', 'description'])
            ->orderBy('name')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => $contacts,
        ]);
    }
}
