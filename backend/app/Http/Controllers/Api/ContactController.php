<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProfessionalContact;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ContactController extends Controller
{
    // Public and read-only: the list shown on the Contact Us page. Every column
    // is loaded and only the fields below are returned (so the page keeps working
    // even before the photo_path migration has been run).
    public function index(): JsonResponse
    {
        $contacts = ProfessionalContact::query()
            ->orderBy('name')
            ->orderBy('id')
            ->get()
            ->map(fn (ProfessionalContact $contact) => [
                'id' => $contact->id,
                'name' => $contact->name,
                'title' => $contact->title,
                'email' => $contact->email,
                'phone' => $contact->phone,
                'description' => $contact->description,
                // Null when the contact has no picture (the file path itself
                // is never exposed).
                'photo_url' => $contact->photo_path
                    ? url("/api/contacts/{$contact->id}/photo").'?v='.substr(md5($contact->photo_path), 0, 8)
                    : null,
            ]);

        return response()->json([
            'data' => $contacts,
        ]);
    }

    // The picture of a listed contact (the contact list itself is public).
    // The file lives on the private disk, so it is streamed from here.
    public function photo(ProfessionalContact $contact): StreamedResponse
    {
        $disk = Storage::disk(config('filesystems.activity_materials.disk'));

        abort_unless($contact->photo_path && $disk->exists($contact->photo_path), 404);

        return $disk->response($contact->photo_path, null, [
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'public, max-age=3600',
        ]);
    }
}
