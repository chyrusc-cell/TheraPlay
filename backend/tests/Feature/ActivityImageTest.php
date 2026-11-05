<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ActivityImageTest extends TestCase
{
    use RefreshDatabase;

    private const JSON = ['Accept' => 'application/json'];

    private function login(string $role): User
    {
        $user = User::create(['name' => 'U', 'email' => $role.'@example.com', 'password' => 'password123']);
        $user->forceFill(['role' => $role])->save();
        Sanctum::actingAs($user);

        return $user;
    }

    private function activity(bool $published = true): Activity
    {
        $activity = new Activity([
            'title' => 'Memory Match',
            'instructions' => ['Step one'],
            'materials' => [],
            'difficulty' => 'Easy',
        ]);
        $activity->is_published = $published;
        $activity->save();

        return $activity;
    }

    private function png(string $name = 'pic.png'): UploadedFile
    {
        return UploadedFile::fake()->image($name, 80, 60);
    }

    public function test_admin_can_upload_a_picture_and_the_public_can_see_it_on_a_published_activity(): void
    {
        Storage::fake('local');
        $this->login('admin');
        $activity = $this->activity();

        $this->post("/api/admin/activities/{$activity->id}/image", ['image' => $this->png()], self::JSON)
            ->assertOk()
            ->assertJsonPath('message', 'Picture saved.');

        $path = $activity->fresh()->image_path;
        $this->assertStringStartsWith('activity-images/', $path);
        Storage::disk('local')->assertExists($path);

        // Public list and details expose a URL, never the stored path.
        $list = $this->getJson('/api/activities')->assertOk();
        $this->assertStringContainsString("/api/activities/{$activity->id}/image", $list->json('data.0.image_url'));
        $this->assertStringNotContainsString('activity-images/', $list->getContent());
        $this->assertArrayNotHasKey('image_path', $list->json('data.0'));
        $this->assertNotNull($this->getJson("/api/activities/{$activity->id}")->json('data.image_url'));

        $this->app['auth']->forgetGuards();
        $this->get("/api/activities/{$activity->id}/image")->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
    }

    public function test_a_drafts_picture_is_not_public_but_the_admin_can_still_see_it(): void
    {
        Storage::fake('local');
        $this->login('admin');
        $activity = $this->activity(published: false);

        $this->post("/api/admin/activities/{$activity->id}/image", ['image' => $this->png()], self::JSON)->assertOk();

        $this->get("/api/activities/{$activity->id}/image")->assertNotFound();
        $this->get("/api/admin/activities/{$activity->id}/image")->assertOk();

        $this->postJson("/api/admin/activities/{$activity->id}/unpublish")->assertOk();
        $this->postJson("/api/admin/activities/{$activity->id}/publish")->assertOk();
        $this->get("/api/activities/{$activity->id}/image")->assertOk();
        $this->postJson("/api/admin/activities/{$activity->id}/unpublish")->assertOk();
        $this->get("/api/activities/{$activity->id}/image")->assertNotFound();
    }

    public function test_replacing_and_removing_delete_the_old_file(): void
    {
        Storage::fake('local');
        $this->login('admin');
        $activity = $this->activity();

        $this->post("/api/admin/activities/{$activity->id}/image", ['image' => $this->png()], self::JSON)->assertOk();
        $first = $activity->fresh()->image_path;

        $this->post("/api/admin/activities/{$activity->id}/image", ['image' => $this->png('b.png')], self::JSON)->assertOk();
        $second = $activity->fresh()->image_path;

        $this->assertNotSame($first, $second);
        Storage::disk('local')->assertMissing($first);
        Storage::disk('local')->assertExists($second);

        $this->deleteJson("/api/admin/activities/{$activity->id}/image")->assertOk()->assertJsonPath('data.image_url', null);
        Storage::disk('local')->assertMissing($second);
        $this->assertNull($activity->fresh()->image_path);
        $this->get("/api/activities/{$activity->id}/image")->assertNotFound();
    }

    public function test_invalid_and_oversized_files_are_rejected(): void
    {
        Storage::fake('local');
        $this->login('admin');
        $activity = $this->activity();
        $url = "/api/admin/activities/{$activity->id}/image";

        $this->post($url, ['image' => UploadedFile::fake()->createWithContent('evil.png', 'not an image')], self::JSON)
            ->assertStatus(422)->assertJsonValidationErrors('image');
        $this->post($url, ['image' => UploadedFile::fake()->create('doc.pdf', 10, 'application/pdf')], self::JSON)->assertStatus(422);
        $this->post($url, ['image' => UploadedFile::fake()->image('big.png', 10, 10)->size(6000)], self::JSON)->assertStatus(422);
        $this->post($url, [], self::JSON)->assertStatus(422);

        $this->assertNull($activity->fresh()->image_path);
    }

    public function test_guests_and_parents_cannot_manage_pictures(): void
    {
        Storage::fake('local');
        $activity = $this->activity();
        $url = "/api/admin/activities/{$activity->id}/image";

        $this->post($url, ['image' => $this->png()], self::JSON)->assertUnauthorized();
        $this->deleteJson($url)->assertUnauthorized();
        $this->getJson($url)->assertUnauthorized();

        $this->login('parent');
        $this->post($url, ['image' => $this->png()], self::JSON)->assertForbidden();
        $this->deleteJson($url)->assertForbidden();
        $this->getJson($url)->assertForbidden();
        $this->assertNull($activity->fresh()->image_path);
    }

    public function test_a_client_cannot_set_the_stored_path_through_the_normal_form(): void
    {
        $this->login('admin');
        $activity = $this->activity();

        $this->putJson("/api/admin/activities/{$activity->id}", ['title' => 'New', 'image_path' => '../../.env'])->assertOk();

        $this->assertNull($activity->fresh()->image_path);
    }

    public function test_activities_without_pictures_and_with_legacy_values_still_work(): void
    {
        $activity = $this->activity();
        $activity->forceFill(['image_path' => 'old/placeholder.png'])->save();

        $this->getJson('/api/activities')->assertOk()->assertJsonPath('data.0.image_url', null);
        $this->getJson("/api/activities/{$activity->id}")->assertOk()->assertJsonPath('data.image_url', null);
        $this->get("/api/activities/{$activity->id}/image")->assertNotFound();
    }

    public function test_the_public_list_includes_the_category_name_for_the_filters(): void
    {
        $category = \App\Models\Category::create(['name' => 'Memory']);
        $activity = $this->activity();
        $activity->forceFill(['category_id' => $category->id])->save();

        $this->getJson('/api/activities')->assertOk()->assertJsonPath('data.0.category', 'Memory');
    }
}
