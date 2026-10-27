<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProfessionalContact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Admin-only management of professional contacts. Every route that reaches
 * this controller is protected by ['auth:sanctum', 'role:admin'].
 *
 * Contacts are standalone records; nothing here touches user accounts.
 */
class ContactManagementController extends Controller
{
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
        $contact->delete();

        return response()->json(['message' => 'Contact deleted.']);
    }

    /**
     * On create the main fields are required; on update (PUT or PATCH) a field
     * is only checked when it is sent, so partial updates work.
     */
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
            'created_at' => $contact->created_at,
            'updated_at' => $contact->updated_at,
        ];
    }
}
