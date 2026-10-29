<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ProfilePhotoTest extends TestCase
{
    use RefreshDatabase;

    private const JSON = ['Accept' => 'application/json'];

    private function makeUser(string $role, ?string $email = null): User
    {
        $user = User::create([
            'name' => ucfirst($role),
            'email' => $email ?? $role.'@example.com',
            'password' => 'password123',
        ]);
        $user->forceFill(['role' => $role])->save();

        return $user;
    }

    private function png(string $name = 'me.png'): UploadedFile
    {
        return UploadedFile::fake()->image($name, 60, 60);
    }

    #[DataProvider('roles')]
    public function test_parents_and_admins_can_upload_replace_and_remove_their_own_picture(string $role): void
    {
        Storage::fake('local');
        $user = $this->makeUser($role);
        Sanctum::actingAs($user);

        $this->assertNull($this->getJson('/api/user')->json('photo_url'));

        $this->post('/api/profile/photo', ['photo' => $this->png()], self::JSON)->assertOk();
        $first = $user->fresh()->photo_path;
        $this->assertStringStartsWith('profile-photos/', $first);
        Storage::disk('local')->assertExists($first);

        // It is part of the authenticated-user response, and the path is not.
        $me = $this->getJson('/api/user')->assertOk();
        $this->assertStringContainsString('/api/profile/photo', $me->json('photo_url'));
        $this->assertArrayNotHasKey('photo_path', $me->json());
        $this->get('/api/profile/photo')->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');

        $this->post('/api/profile/photo', ['photo' => $this->png('b.png')], self::JSON)->assertOk();
        $second = $user->fresh()->photo_path;
        $this->assertNotSame($first, $second);
        Storage::disk('local')->assertMissing($first);
        Storage::disk('local')->assertExists($second);

        $this->deleteJson('/api/profile/photo')->assertOk()->assertJsonPath('data.photo_url', null);
        Storage::disk('local')->assertMissing($second);
        $this->get('/api/profile/photo')->assertNotFound();
    }

    public static function roles(): array
    {
        return [['parent'], ['admin']];
    }

    public function test_the_picture_persists_across_logout_and_login(): void
    {
        Storage::fake('local');
        $user = $this->makeUser('parent');
        Sanctum::actingAs($user);
        $this->post('/api/profile/photo', ['photo' => $this->png()], self::JSON)->assertOk();

        $this->app['auth']->forgetGuards();
        $token = $this->postJson('/api/login', ['email' => 'parent@example.com', 'password' => 'password123'])->json('token');

        $this->withToken($token)->getJson('/api/user')->assertOk()->assertJsonPath('photo_url', fn ($url) => is_string($url));
    }

    public function test_a_picture_only_ever_belongs_to_the_logged_in_account(): void
    {
        Storage::fake('local');
        $other = $this->makeUser('parent', 'other@example.com');
        $me = $this->makeUser('parent', 'me@example.com');

        Sanctum::actingAs($other);
        $this->post('/api/profile/photo', ['photo' => $this->png()], self::JSON)->assertOk();
        $otherPath = $other->fresh()->photo_path;

        Sanctum::actingAs($me);
        // A user id in the request is ignored: this only touches my own account.
        $this->post('/api/profile/photo', ['photo' => $this->png(), 'user_id' => $other->id], self::JSON)->assertOk();
        $this->get('/api/profile/photo')->assertOk();

        $this->assertSame($otherPath, $other->fresh()->photo_path);
        Storage::disk('local')->assertExists($otherPath);
        $this->assertNotSame($otherPath, $me->fresh()->photo_path);

        $this->deleteJson('/api/profile/photo')->assertOk();
        $this->assertSame($otherPath, $other->fresh()->photo_path);
        Storage::disk('local')->assertExists($otherPath);
    }

    public function test_guests_are_denied(): void
    {
        $this->post('/api/profile/photo', ['photo' => $this->png()], self::JSON)->assertUnauthorized();
        $this->deleteJson('/api/profile/photo')->assertUnauthorized();
        $this->getJson('/api/profile/photo')->assertUnauthorized();
    }

    public function test_invalid_and_oversized_files_are_rejected_and_nothing_else_changes(): void
    {
        Storage::fake('local');
        $user = $this->makeUser('parent');
        Sanctum::actingAs($user);

        $this->post('/api/profile/photo', ['photo' => UploadedFile::fake()->createWithContent('x.png', 'not an image')], self::JSON)
            ->assertStatus(422)->assertJsonValidationErrors('photo');
        $this->post('/api/profile/photo', ['photo' => UploadedFile::fake()->create('d.pdf', 10, 'application/pdf')], self::JSON)->assertStatus(422);
        $this->post('/api/profile/photo', ['photo' => UploadedFile::fake()->image('big.png', 10, 10)->size(3000)], self::JSON)->assertStatus(422);
        $this->post('/api/profile/photo', [], self::JSON)->assertStatus(422);

        $this->assertNull($user->fresh()->photo_path);
    }

    public function test_uploading_never_changes_role_password_or_other_fields(): void
    {
        Storage::fake('local');
        $user = $this->makeUser('parent');
        $hash = $user->password;
        Sanctum::actingAs($user);

        $this->post('/api/profile/photo', [
            'photo' => $this->png(),
            'role' => 'admin',
            'password' => 'hacked-password',
            'name' => 'Hacker',
        ], self::JSON)->assertOk();

        $fresh = $user->fresh();
        $this->assertSame('parent', $fresh->role);
        $this->assertSame('Parent', $fresh->name);
        $this->assertSame($hash, $fresh->password);
        $this->assertTrue(Hash::check('password123', $fresh->password));
    }

    public function test_deleting_an_account_removes_its_picture_file(): void
    {
        Storage::fake('local');
        $admin = $this->makeUser('admin');
        $parent = $this->makeUser('parent');

        Sanctum::actingAs($parent);
        $this->post('/api/profile/photo', ['photo' => $this->png()], self::JSON)->assertOk();
        $path = $parent->fresh()->photo_path;

        Sanctum::actingAs($admin);
        $this->deleteJson("/api/admin/users/{$parent->id}")->assertOk();

        Storage::disk('local')->assertMissing($path);
    }
}
