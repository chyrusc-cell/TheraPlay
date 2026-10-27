<?php

namespace Tests\Feature;

use App\Models\ProfessionalContact;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProfessionalContactTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $email, string $role = 'parent'): User
    {
        $user = User::create([
            'name' => 'Test User',
            'email' => $email,
            'password' => 'password123',
        ]);

        $user->forceFill(['role' => $role])->save();

        return $user;
    }

    private function makeContact(array $overrides = []): ProfessionalContact
    {
        return ProfessionalContact::create(array_merge([
            'name' => 'Dr. Ana Reyes',
            'title' => 'Occupational Therapist',
            'email' => 'ana@example.com',
            'phone' => '+63 917 123 4567',
            'description' => 'Pediatric specialist.',
        ], $overrides));
    }

    private function validPayload(array $extra = []): array
    {
        return array_merge([
            'name' => 'Dr. Ben Cruz',
            'title' => 'Speech Therapist',
            'email' => 'ben@example.com',
            'phone' => '0917-123-4567',
            'description' => 'Works with early communication.',
        ], $extra);
    }

    public function test_tests_use_the_isolated_in_memory_database(): void
    {
        $this->assertSame('sqlite', config('database.default'));
        $this->assertSame(':memory:', config('database.connections.sqlite.database'));
    }

    // --- Public endpoint ---

    public function test_guest_can_read_the_public_contacts_list(): void
    {
        $this->makeContact();

        $this->getJson('/api/contacts')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Dr. Ana Reyes')
            ->assertJsonPath('data.0.title', 'Occupational Therapist');
    }

    public function test_public_response_contains_only_the_intended_fields(): void
    {
        $this->makeContact();

        $contact = $this->getJson('/api/contacts')->json('data.0');

        $this->assertEqualsCanonicalizing(
            ['id', 'name', 'title', 'email', 'phone', 'description'],
            array_keys($contact)
        );
    }

    public function test_public_list_is_empty_when_there_are_no_contacts(): void
    {
        $this->getJson('/api/contacts')
            ->assertOk()
            ->assertExactJson(['data' => []]);
    }

    public function test_public_endpoint_is_read_only(): void
    {
        $contact = $this->makeContact();

        $this->postJson('/api/contacts', $this->validPayload())->assertStatus(405);
        $this->putJson("/api/contacts/{$contact->id}", $this->validPayload())->assertStatus(404);
        $this->deleteJson("/api/contacts/{$contact->id}")->assertStatus(404);

        $this->assertSame(1, ProfessionalContact::count());
    }

    // --- Access control on the admin endpoints ---

    private function adminEndpoints(ProfessionalContact $contact): array
    {
        return [
            ['getJson', '/api/admin/contacts'],
            ['postJson', '/api/admin/contacts'],
            ['getJson', "/api/admin/contacts/{$contact->id}"],
            ['putJson', "/api/admin/contacts/{$contact->id}"],
            ['patchJson', "/api/admin/contacts/{$contact->id}"],
            ['deleteJson', "/api/admin/contacts/{$contact->id}"],
        ];
    }

    public function test_guests_cannot_use_the_admin_contact_endpoints(): void
    {
        $contact = $this->makeContact();

        foreach ($this->adminEndpoints($contact) as [$method, $url]) {
            $this->$method($url, $this->validPayload())->assertUnauthorized();
        }

        $this->assertSame(1, ProfessionalContact::count());
    }

    public function test_parents_cannot_use_the_admin_contact_endpoints(): void
    {
        $contact = $this->makeContact();
        Sanctum::actingAs($this->makeUser('parent@example.com'));

        foreach ($this->adminEndpoints($contact) as [$method, $url]) {
            $this->$method($url, $this->validPayload(['name' => 'Hacked']))->assertForbidden();
        }

        $this->assertSame(1, ProfessionalContact::count());
        $this->assertSame('Dr. Ana Reyes', $contact->fresh()->name);
    }

    // --- Admin management ---

    public function test_admin_can_list_and_view_contacts(): void
    {
        $contact = $this->makeContact();
        $this->makeContact(['name' => 'Dr. Zed', 'email' => 'zed@example.com']);
        Sanctum::actingAs($this->makeUser('admin@example.com', 'admin'));

        $this->getJson('/api/admin/contacts')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson("/api/admin/contacts/{$contact->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $contact->id)
            ->assertJsonPath('data.email', 'ana@example.com');
    }

    public function test_admin_can_create_a_contact(): void
    {
        Sanctum::actingAs($this->makeUser('admin@example.com', 'admin'));

        $response = $this->postJson('/api/admin/contacts', $this->validPayload())
            ->assertCreated()
            ->assertJsonPath('data.name', 'Dr. Ben Cruz')
            ->assertJsonPath('data.title', 'Speech Therapist');

        $this->assertDatabaseHas('professional_contacts', [
            'id' => $response->json('data.id'),
            'email' => 'ben@example.com',
        ]);
    }

    public function test_a_contact_may_have_only_an_email_or_only_a_phone(): void
    {
        Sanctum::actingAs($this->makeUser('admin@example.com', 'admin'));

        $this->postJson('/api/admin/contacts', $this->validPayload(['phone' => null]))
            ->assertCreated();

        $this->postJson('/api/admin/contacts', $this->validPayload(['email' => null]))
            ->assertCreated();

        $this->assertSame(2, ProfessionalContact::count());
    }

    public function test_invalid_contact_data_returns_validation_errors(): void
    {
        Sanctum::actingAs($this->makeUser('admin@example.com', 'admin'));

        $cases = [
            'no data' => [[], ['name', 'title', 'email', 'phone']],
            'empty name' => [$this->validPayload(['name' => '']), ['name']],
            'missing title' => [array_diff_key($this->validPayload(), ['title' => 1]), ['title']],
            'bad email' => [$this->validPayload(['email' => 'not-an-email']), ['email']],
            'bad phone' => [$this->validPayload(['phone' => 'call me']), ['phone']],
            'phone too long' => [$this->validPayload(['phone' => str_repeat('1', 31)]), ['phone']],
            'name too long' => [$this->validPayload(['name' => str_repeat('a', 256)]), ['name']],
            'description too long' => [$this->validPayload(['description' => str_repeat('a', 5001)]), ['description']],
            'neither email nor phone' => [$this->validPayload(['email' => null, 'phone' => null]), ['email', 'phone']],
        ];

        foreach ($cases as $label => [$payload, $errorFields]) {
            $this->postJson('/api/admin/contacts', $payload)
                ->assertStatus(422, "Expected 422 for: {$label}")
                ->assertJsonValidationErrors($errorFields);
        }

        $this->assertSame(0, ProfessionalContact::count());
    }

    public function test_admin_can_update_a_contact(): void
    {
        $contact = $this->makeContact();
        Sanctum::actingAs($this->makeUser('admin@example.com', 'admin'));

        $this->putJson("/api/admin/contacts/{$contact->id}", $this->validPayload([
            'name' => 'Dr. Updated',
        ]))
            ->assertOk()
            ->assertJsonPath('data.name', 'Dr. Updated');

        $this->patchJson("/api/admin/contacts/{$contact->id}", ['title' => 'Physiotherapist'])
            ->assertOk()
            ->assertJsonPath('data.title', 'Physiotherapist')
            ->assertJsonPath('data.name', 'Dr. Updated');

        $this->assertSame('Physiotherapist', $contact->fresh()->title);
    }

    public function test_update_cannot_remove_the_last_contact_method(): void
    {
        $contact = $this->makeContact(['phone' => null]);
        Sanctum::actingAs($this->makeUser('admin@example.com', 'admin'));

        // Only an email exists, so removing it must be refused...
        $this->patchJson("/api/admin/contacts/{$contact->id}", ['email' => null])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'phone']);

        $this->assertSame('ana@example.com', $contact->fresh()->email);

        // ...but swapping it for a phone number in one request is fine.
        $this->patchJson("/api/admin/contacts/{$contact->id}", [
            'email' => null,
            'phone' => '0917 000 1111',
        ])->assertOk();
    }

    public function test_invalid_update_returns_422_and_changes_nothing(): void
    {
        $contact = $this->makeContact();
        Sanctum::actingAs($this->makeUser('admin@example.com', 'admin'));

        $this->patchJson("/api/admin/contacts/{$contact->id}", ['name' => ''])
            ->assertStatus(422)
            ->assertJsonValidationErrors('name');

        $this->assertSame('Dr. Ana Reyes', $contact->fresh()->name);
    }

    public function test_admin_can_delete_a_contact_without_touching_any_user(): void
    {
        $admin = $this->makeUser('admin@example.com', 'admin');
        $parent = $this->makeUser('parent@example.com');
        $contact = $this->makeContact(['email' => 'parent@example.com']);
        Sanctum::actingAs($admin);

        $this->deleteJson("/api/admin/contacts/{$contact->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Contact deleted.');

        $this->assertDatabaseMissing('professional_contacts', ['id' => $contact->id]);
        $this->assertSame(2, User::count());
        $this->assertSame('parent', $parent->fresh()->role);
        $this->assertSame('parent@example.com', $parent->fresh()->email);
    }

    public function test_missing_or_deleted_contacts_return_404(): void
    {
        $contact = $this->makeContact();
        Sanctum::actingAs($this->makeUser('admin@example.com', 'admin'));

        $this->getJson('/api/admin/contacts/9999')->assertNotFound();
        $this->putJson('/api/admin/contacts/9999', $this->validPayload())->assertNotFound();
        $this->deleteJson('/api/admin/contacts/9999')->assertNotFound();

        $this->deleteJson("/api/admin/contacts/{$contact->id}")->assertOk();
        $this->getJson("/api/admin/contacts/{$contact->id}")->assertNotFound();
        $this->deleteJson("/api/admin/contacts/{$contact->id}")->assertNotFound();
    }
}
