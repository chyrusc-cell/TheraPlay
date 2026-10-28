<?php

namespace Tests\Feature;

use App\Models\ProfessionalContact;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ContactPhotoTest extends TestCase
{
    use RefreshDatabase;

    private function actingAs_(string $role): User
    {
        $user = User::create(['name' => 'U', 'email' => $role.'@example.com', 'password' => 'password123']);
        $user->forceFill(['role' => $role])->save();
        Sanctum::actingAs($user);

        return $user;
    }

    private function contact(): ProfessionalContact
    {
        return ProfessionalContact::create([
            'name' => 'Dr. Ana', 'title' => 'OT', 'email' => 'ana@example.com',
        ]);
    }

    private function png(string $name = 'face.png'): UploadedFile
    {
        return UploadedFile::fake()->image($name, 60, 60);
    }

    public function test_admin_can_upload_a_picture_and_it_persists_and_is_served(): void
    {
        Storage::fake('local');
        $this->actingAs_('admin');
        $contact = $this->contact();

        $this->assertNull($this->getJson("/api/admin/contacts/{$contact->id}")->json('data.photo_url'));

        $response = $this->post("/api/admin/contacts/{$contact->id}/photo", ['photo' => $this->png()], ['Accept' => 'application/json'])
            ->assertOk();

        $path = $contact->fresh()->photo_path;
        $this->assertNotNull($path);
        Storage::disk('local')->assertExists($path);
        $this->assertStringContainsString("/api/contacts/{$contact->id}/photo", $response->json('data.photo_url'));

        // Still there when the record is read again, and public.
        $this->assertNotNull($this->getJson("/api/admin/contacts/{$contact->id}")->json('data.photo_url'));
        $this->get("/api/contacts/{$contact->id}/photo")->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_replacing_and_removing_delete_the_old_file(): void
    {
        Storage::fake('local');
        $this->actingAs_('admin');
        $contact = $this->contact();

        $this->post("/api/admin/contacts/{$contact->id}/photo", ['photo' => $this->png()], ['Accept' => 'application/json'])->assertOk();
        $first = $contact->fresh()->photo_path;

        $this->post("/api/admin/contacts/{$contact->id}/photo", ['photo' => $this->png('b.png')], ['Accept' => 'application/json'])->assertOk();
        $second = $contact->fresh()->photo_path;

        $this->assertNotSame($first, $second);
        Storage::disk('local')->assertMissing($first);
        Storage::disk('local')->assertExists($second);

        $this->deleteJson("/api/admin/contacts/{$contact->id}/photo")->assertOk()->assertJsonPath('data.photo_url', null);
        Storage::disk('local')->assertMissing($second);
        $this->get("/api/contacts/{$contact->id}/photo")->assertNotFound();
    }

    public function test_deleting_a_contact_removes_its_picture_file(): void
    {
        Storage::fake('local');
        $this->actingAs_('admin');
        $contact = $this->contact();

        $this->post("/api/admin/contacts/{$contact->id}/photo", ['photo' => $this->png()], ['Accept' => 'application/json'])->assertOk();
        $path = $contact->fresh()->photo_path;

        $this->deleteJson("/api/admin/contacts/{$contact->id}")->assertOk();
        Storage::disk('local')->assertMissing($path);
    }

    public function test_non_images_and_oversized_files_are_rejected(): void
    {
        Storage::fake('local');
        $this->actingAs_('admin');
        $contact = $this->contact();
        $url = "/api/admin/contacts/{$contact->id}/photo";

        // Text content with an image name and image MIME type claimed by the client.
        $fake = UploadedFile::fake()->createWithContent('evil.png', 'not an image at all');
        $this->post($url, ['photo' => $fake], ['Accept' => 'application/json'])->assertStatus(422)->assertJsonValidationErrors('photo');

        $this->post($url, ['photo' => UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf')], ['Accept' => 'application/json'])
            ->assertStatus(422);

        $big = UploadedFile::fake()->image('big.png', 10, 10)->size(3000);
        $this->post($url, ['photo' => $big], ['Accept' => 'application/json'])->assertStatus(422);

        $this->post($url, [], ['Accept' => 'application/json'])->assertStatus(422);
        $this->assertNull($contact->fresh()->photo_path);
    }

    public function test_only_admins_can_change_pictures(): void
    {
        Storage::fake('local');
        $contact = $this->contact();
        $url = "/api/admin/contacts/{$contact->id}/photo";

        $this->post($url, ['photo' => $this->png()], ['Accept' => 'application/json'])->assertUnauthorized();
        $this->deleteJson($url)->assertUnauthorized();

        $this->actingAs_('parent');
        $this->post($url, ['photo' => $this->png()], ['Accept' => 'application/json'])->assertForbidden();
        $this->deleteJson($url)->assertForbidden();
        $this->assertNull($contact->fresh()->photo_path);
    }

    public function test_the_public_list_is_unchanged_and_old_contacts_work_without_pictures(): void
    {
        $this->contact();

        $row = $this->getJson('/api/contacts')->assertOk()->json('data.0');
        $this->assertEqualsCanonicalizing(['id', 'name', 'title', 'email', 'phone', 'description', 'photo_url'], array_keys($row));
        $this->assertNull($row['photo_url']);
        $this->get('/api/contacts/1/photo')->assertNotFound();
    }
}
