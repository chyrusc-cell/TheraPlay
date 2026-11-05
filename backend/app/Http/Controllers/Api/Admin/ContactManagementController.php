<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\ValidatesImageUploads;
use App\Http\Controllers\Controller;
use App\Models\ProfessionalContact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Admin-only management of professional contacts. Every route that reaches
 * this controller is protected by ['auth:sanctum', 'role:admin'].
 *
 * Contacts are standalone records; nothing here touches user accounts.
 */
class ContactManagementController extends Controller
{
    use ValidatesImageUploads;

    // Contact pictures: at most 2 MB (the usual PHP upload limit).
    private const PHOTO_MAX_KB = 2048;

    public function index(): JsonResponse
    {
        $contacts = ProfessionalContact::query()
            ->orderBy('name')
            ->orderBy('id')
            ->get()
            ->map(fn (ProfessionalContact $contact) => $this->format($contact));

        return response()->json(['data' => $contacts]);
    }

    public function show(ProfessionalContact $contact): JsonResponse
    {
        return response()->json(['data' => $this->format($contact)]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate($this->rules(creating: true));

        $this->ensureContactMethod(
            $validated['email'] ?? null,
            $validated['phone'] ?? null
        );

        $contact = ProfessionalContact::create($validated);

        return response()->json([
            'message' => 'Contact created.',
            'data' => $this->format($contact),
        ], 201);
    }

    public function update(Request $request, ProfessionalContact $contact): JsonResponse
    {
        $validated = $request->validate($this->rules(creating: false));

        // A field that is not sent keeps its current value.
        $this->ensureContactMethod(
            array_key_exists('email', $validated) ? $validated['email'] : $contact->email,
            array_key_exists('phone', $validated) ? $validated['phone'] : $contact->phone
        );

        $contact->update($validated);

        return response()->json([
            'message' => 'Contact updated.',
            'data' => $this->format($contact),
        ]);
    }

    public function destroy(ProfessionalContact $contact): JsonResponse
    {
        $path = $contact->photo_path;

        $contact->delete();

        if ($path) {
            $this->photoDisk()->delete($path);
        }

        return response()->json(['message' => 'Contact deleted.']);
    }

    /**
     * On create the main fields are required; on update (PUT or PATCH) a field
     * is only checked when it is sent, so partial updates work.
     */
    // Replaces the contact's picture. The type is decided from the file's real
    // content (not the name or the client's MIME type) and it must decode as an
    // image. Stored on the private disk and served by ContactController::photo.
    public function storePhoto(Request $request, ProfessionalContact $contact): JsonResponse
    {
        $maxKb = self::PHOTO_MAX_KB;

        $request->validate([
            'photo' => [
                'bail',
                'required',
                'file',
                "max:{$maxKb}",
                function (string $attribute, mixed $file, \Closure $fail) {
                    if (! $file instanceof UploadedFile || $this->imageExtension($file) === null) {
                        $fail('The picture must be a JPG, PNG or WebP image.');
                    }
                },
            ],
        ], [
            'photo.max' => 'The picture must be '.round($maxKb / 1024, 1).' MB or smaller.',
            'photo.uploaded' => 'The picture could not be uploaded. It may be larger than the server allows.',
        ]);

        $file = $request->file('photo');
        $disk = $this->photoDisk();

        $path = $disk->putFileAs('contact-photos', $file, Str::uuid().'.'.$this->imageExtension($file));

        if ($path === false) {
            return response()->json(['message' => 'The picture could not be stored.'], 500);
        }

        $old = $contact->photo_path;
        $contact->forceFill(['photo_path' => $path])->save();

        if ($old) {
            $disk->delete($old);
        }

        return response()->json([
            'message' => 'Picture saved.',
            'data' => $this->format($contact),
        ]);
    }

    public function destroyPhoto(ProfessionalContact $contact): JsonResponse
    {
        $old = $contact->photo_path;

        if ($old) {
            $contact->forceFill(['photo_path' => null])->save();
            $this->photoDisk()->delete($old);
        }

        return response()->json([
            'message' => 'Picture removed.',
            'data' => $this->format($contact),
        ]);
    }

    private function photoDisk()
    {
        return Storage::disk(config('filesystems.activity_materials.disk'));
    }

    private function rules(bool $creating): array
    {
        $required = $creating ? ['required'] : ['sometimes', 'required'];

        // On create, report a missing email/phone together with the other
        // errors. On update the combined check in ensureContactMethod() applies.
        $emailRule = $creating ? ['required_without:phone'] : [];
        $phoneRule = $creating ? ['required_without:email'] : [];

        return [
            'name' => [...$required, 'string', 'max:255'],
            'title' => [...$required, 'string', 'max:255'],
            'email' => [...$emailRule, 'nullable', 'string', 'email', 'max:255'],
            'phone' => [...$phoneRule, 'nullable', 'string', 'max:30', 'regex:/^[0-9+().\-\s]+$/'],
            'description' => ['nullable', 'string', 'max:5000'],
        ];
    }

    // A contact must always be reachable by email or phone.
    private function ensureContactMethod(?string $email, ?string $phone): void
    {
        if (blank($email) && blank($phone)) {
            $message = 'Provide an email address or a phone number.';

            throw ValidationException::withMessages([
                'email' => [$message],
                'phone' => [$message],
            ]);
        }
    }

    private function format(ProfessionalContact $contact): array
    {
        return [
            'id' => $contact->id,
            'name' => $contact->name,
            'title' => $contact->title,
            'email' => $contact->email,
            'phone' => $contact->phone,
            'description' => $contact->description,
            'photo_url' => $contact->photo_path
                ? url("/api/contacts/{$contact->id}/photo").'?v='.substr(md5($contact->photo_path), 0, 8)
                : null,
            'created_at' => $contact->created_at,
            'updated_at' => $contact->updated_at,
        ];
    }
}
