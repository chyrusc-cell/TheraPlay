<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityProgress;
use App\Models\ActivityResource;
use App\Models\Child;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * An archived activity and its picture/attachments are frozen until it is
 * restored. Uses a fake disk, so no real file is touched.
 */
class ArchivedActivityContentTest extends TestCase
{
    use RefreshDatabase;

    private const JSON = ['Accept' => 'application/json'];

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    private function user(string $role): User
    {
        $user = User::firstOrCreate(['email' => $role.'@example.com'], ['name' => ucfirst($role), 'password' => 'password123']);
        $user->forceFill(['role' => $role])->save();

        return $user;
    }

    /** An activity that has a picture and one attachment, optionally archived. */
    private function activity(string $title, bool $archived): Activity
    {
        $activity = Activity::create(['title' => $title, 'instructions' => ['Go'], 'materials' => [], 'difficulty' => 'Easy']);
        $activity->forceFill(['is_published' => true])->save();

        $picture = "activity-images/{$activity->id}.png";
        Storage::disk('local')->put($picture, 'png');
        $activity->forceFill(['image_path' => $picture])->save();

        $file = "activity-materials/{$activity->id}/guide.pdf";
        Storage::disk('local')->put($file, 'pdf');
        ActivityResource::create(['activity_id' => $activity->id, 'title' => 'Guide', 'file_name' => 'guide.pdf', 'file_path' => $file, 'file_type' => 'pdf']);

        if ($archived) {
            $activity->forceFill(['archived_was_published' => true, 'is_published' => false, 'archived_at' => now()])->save();
        }

        return $activity->fresh();
    }

    private function assertUntouched(Activity $activity, ?string $title = null): void
    {
        $activity = $activity->fresh();
        $this->assertSame(1, $activity->resources()->count());
        Storage::disk('local')->assertExists($activity->image_path);
        Storage::disk('local')->assertExists("activity-materials/{$activity->id}/guide.pdf");

        if ($title !== null) {
            $this->assertSame($title, $activity->title);
        }
    }

    public function test_an_archived_activity_rejects_picture_uploads_replacements_and_removal(): void
    {
        $activity = $this->activity('Frozen', archived: true);
        Sanctum::actingAs($this->user('admin'));
        $before = $activity->image_path;
        $url = "/api/admin/activities/{$activity->id}/image";

        $this->post($url, ['image' => UploadedFile::fake()->image('new.png', 80, 60)], self::JSON)
            ->assertStatus(409)->assertJsonPath('code', 'activity_archived');
        $this->deleteJson($url)
            ->assertStatus(409)->assertJsonPath('code', 'activity_archived');

        $this->assertSame($before, $activity->fresh()->image_path);
        $this->assertUntouched($activity);
    }

    public function test_an_archived_activity_rejects_attachment_uploads_and_removal(): void
    {
        $activity = $this->activity('Frozen', archived: true);
        Sanctum::actingAs($this->user('admin'));
        $resource = $activity->resources()->first();

        $this->post("/api/admin/activities/{$activity->id}/resources", [
            'files' => [UploadedFile::fake()->create('extra.pdf', 10, 'application/pdf')],
        ], self::JSON)->assertStatus(409)->assertJsonPath('code', 'activity_archived');

        $this->deleteJson("/api/admin/activities/{$activity->id}/resources/{$resource->id}")
            ->assertStatus(409)->assertJsonPath('code', 'activity_archived');

        $this->assertUntouched($activity);
    }

    public function test_an_archived_activity_rejects_metadata_changes(): void
    {
        $activity = $this->activity('Frozen', archived: true);
        Sanctum::actingAs($this->user('admin'));

        $this->putJson("/api/admin/activities/{$activity->id}", ['title' => 'Changed', 'description' => 'New'])
            ->assertStatus(409)->assertJsonPath('code', 'activity_archived');
        $this->patchJson("/api/admin/activities/{$activity->id}", ['description' => 'New'])
            ->assertStatus(409)->assertJsonPath('code', 'activity_archived');
        $this->postJson("/api/admin/activities/{$activity->id}/publish")->assertStatus(409);
        $this->postJson("/api/admin/activities/{$activity->id}/unpublish")->assertStatus(409);

        $this->assertUntouched($activity, 'Frozen');
    }

    public function test_an_attachment_id_from_another_activity_cannot_be_used_to_change_an_archived_one(): void
    {
        $archived = $this->activity('Frozen', archived: true);
        $live = $this->activity('Live', archived: false);
        $liveResource = $live->resources()->first();
        Sanctum::actingAs($this->user('admin'));

        // Wrong parent: the scoped binding answers 404 and nothing is deleted.
        $this->deleteJson("/api/admin/activities/{$archived->id}/resources/{$liveResource->id}")->assertNotFound();
        $this->assertUntouched($live);
        $this->assertUntouched($archived);
    }

    public function test_live_activities_can_still_be_changed_and_other_activities_are_not_blocked_by_an_archived_one(): void
    {
        $archived = $this->activity('Frozen', archived: true);
        $live = $this->activity('Live', archived: false);
        Sanctum::actingAs($this->user('admin'));

        $this->post("/api/admin/activities/{$live->id}/image", ['image' => UploadedFile::fake()->image('new.png', 80, 60)], self::JSON)
            ->assertOk();
        $this->post("/api/admin/activities/{$live->id}/resources", [
            'files' => [UploadedFile::fake()->create('extra.pdf', 10, 'application/pdf')],
        ], self::JSON)->assertCreated();
        $this->putJson("/api/admin/activities/{$live->id}", ['title' => 'Live renamed'])->assertOk();

        $this->assertSame(2, $live->fresh()->resources()->count());
        $this->assertUntouched($archived, 'Frozen');
    }

    public function test_restoring_allows_uploads_and_edits_again(): void
    {
        $activity = $this->activity('Frozen', archived: true);
        Sanctum::actingAs($this->user('admin'));

        $this->post("/api/admin/activities/{$activity->id}/image", ['image' => UploadedFile::fake()->image('new.png', 80, 60)], self::JSON)
            ->assertStatus(409);

        $this->postJson("/api/admin/activities/{$activity->id}/restore")->assertOk();

        $this->post("/api/admin/activities/{$activity->id}/image", ['image' => UploadedFile::fake()->image('new.png', 80, 60)], self::JSON)->assertOk();
        $this->post("/api/admin/activities/{$activity->id}/resources", [
            'files' => [UploadedFile::fake()->create('extra.pdf', 10, 'application/pdf')],
        ], self::JSON)->assertCreated();
        $this->putJson("/api/admin/activities/{$activity->id}", ['title' => 'Back'])->assertOk();
        $this->assertSame('Back', $activity->fresh()->title);
    }

    public function test_historical_progress_of_an_archived_activity_stays_readable(): void
    {
        $parent = $this->user('parent');
        $child = Child::create(['user_id' => $parent->id, 'name' => 'Kid']);
        $activity = $this->activity('Frozen', archived: true);
        ActivityProgress::create(['child_id' => $child->id, 'activity_id' => $activity->id, 'status' => 'completed', 'completed_at' => now()]);

        Sanctum::actingAs($parent);
        $this->getJson('/api/progress')->assertOk()
            ->assertJsonFragment(['activity_id' => $activity->id, 'activity_title' => 'Frozen']);
    }

    public function test_unauthorized_users_stay_unauthorized_on_archived_content_routes(): void
    {
        $activity = $this->activity('Frozen', archived: true);
        $resource = $activity->resources()->first();

        $calls = [
            ['post', "/api/admin/activities/{$activity->id}/image"],
            ['delete', "/api/admin/activities/{$activity->id}/image"],
            ['post', "/api/admin/activities/{$activity->id}/resources"],
            ['delete', "/api/admin/activities/{$activity->id}/resources/{$resource->id}"],
        ];

        foreach ($calls as [$method, $url]) {
            $this->{$method}($url, [], self::JSON)->assertUnauthorized();
        }

        Sanctum::actingAs($this->user('parent'));
        foreach ($calls as [$method, $url]) {
            $this->{$method}($url, [], self::JSON)->assertForbidden();
        }
    }
}
