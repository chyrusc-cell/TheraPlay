<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityProgress;
use App\Models\ActivityResource;
use App\Models\Category;
use App\Models\Child;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ActivityArchiveTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role): User
    {
        $user = User::create(['name' => ucfirst($role), 'email' => $role.'@example.com', 'password' => 'password123']);
        $user->forceFill(['role' => $role, 'email_verified_at' => now()])->save();

        return $user;
    }

    private function activity(string $title, bool $published): Activity
    {
        $activity = Activity::create([
            'title' => $title, 'instructions' => ['Go'], 'materials' => [],
            'difficulty' => 'Easy', 'category_id' => Category::where('name', 'Sensory')->value('id'),
        ]);
        $activity->forceFill(['is_published' => $published])->save();

        return $activity;
    }

    private function child(): Child
    {
        return Child::create(['user_id' => $this->user('parent')->id, 'name' => 'Kid']);
    }

    public function test_archiving_hides_an_activity_everywhere_but_keeps_everything(): void
    {
        Storage::fake('local');
        $child = $this->child();
        $activity = $this->activity('Washing Hands', true);
        $progress = ActivityProgress::create(['child_id' => $child->id, 'activity_id' => $activity->id, 'status' => 'completed', 'completed_at' => now()]);
        Storage::disk('local')->put('activity-materials/a.txt', 'x');
        $resource = ActivityResource::create(['activity_id' => $activity->id, 'title' => 'T', 'file_name' => 'a.txt', 'file_path' => 'activity-materials/a.txt', 'file_type' => 'txt']);

        // Visible before.
        $this->getJson('/api/activities')->assertJsonCount(1, 'data');
        $this->getJson("/api/activities/{$activity->id}")->assertOk();

        Sanctum::actingAs($this->user('admin'));
        $this->postJson("/api/admin/activities/{$activity->id}/archive")
            ->assertOk()
            ->assertJsonPath('data.is_archived', true)
            ->assertJsonPath('data.is_published', false);

        // Gone from the public list, details, picture and downloads.
        $this->getJson('/api/activities')->assertJsonCount(0, 'data');
        $this->getJson("/api/activities/{$activity->id}")->assertNotFound();
        $this->getJson("/api/activities/{$activity->id}/image")->assertNotFound();
        $this->get("/api/activities/{$activity->id}/resources/{$resource->id}/download")->assertNotFound();

        // Gone from the normal admin list, present in the archived one.
        $this->getJson('/api/admin/activities')->assertJsonCount(0, 'data');
        $this->getJson('/api/admin/activities?archived=1')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Washing Hands');

        // Nothing was deleted.
        $this->assertNotNull($progress->fresh());
        $this->assertDatabaseHas('activity_resources', ['activity_id' => $activity->id]);
        Storage::disk('local')->assertExists('activity-materials/a.txt');
    }

    public function test_an_archived_activity_cannot_be_completed_but_its_progress_stays(): void
    {
        $child = $this->child();
        $activity = $this->activity('Washing Hands', true);
        ActivityProgress::create(['child_id' => $child->id, 'activity_id' => $activity->id, 'status' => 'completed', 'completed_at' => now()]);
        $other = $this->activity('Other', true);

        Sanctum::actingAs($this->user('admin'));
        $this->postJson("/api/admin/activities/{$activity->id}/archive")->assertOk();

        Sanctum::actingAs(User::find($child->user_id));
        $this->postJson("/api/activities/{$activity->id}/complete")->assertNotFound();
        $this->postJson("/api/activities/{$other->id}/complete")->assertSuccessful();

        // The earlier record is still there and still listed in the history.
        $this->assertSame(2, ActivityProgress::count());
        $this->getJson('/api/progress')->assertOk()->assertJsonFragment(['activity_id' => $activity->id]);
    }

    #[DataProvider('states')]
    public function test_restore_returns_the_previous_publication_state(bool $wasPublished): void
    {
        $activity = $this->activity('Washing Hands', $wasPublished);
        Sanctum::actingAs($this->user('admin'));

        $this->postJson("/api/admin/activities/{$activity->id}/archive")->assertOk();
        $this->postJson("/api/admin/activities/{$activity->id}/restore")
            ->assertOk()
            ->assertJsonPath('data.is_archived', false)
            ->assertJsonPath('data.is_published', $wasPublished);

        $this->getJson('/api/admin/activities')->assertJsonCount(1, 'data');
        $this->getJson('/api/admin/activities?archived=1')->assertJsonCount(0, 'data');
        $this->getJson('/api/activities')->assertJsonCount($wasPublished ? 1 : 0, 'data');
    }

    public static function states(): array
    {
        return ['published stays published' => [true], 'draft stays draft' => [false]];
    }

    public function test_archived_activities_cannot_be_published_edited_or_archived_again_and_live_ones_cannot_be_restored(): void
    {
        $activity = $this->activity('Washing Hands', false);
        Sanctum::actingAs($this->user('admin'));

        $this->postJson("/api/admin/activities/{$activity->id}/restore")->assertStatus(409);

        $this->postJson("/api/admin/activities/{$activity->id}/archive")->assertOk();
        $this->postJson("/api/admin/activities/{$activity->id}/archive")->assertStatus(409);
        $this->postJson("/api/admin/activities/{$activity->id}/publish")->assertStatus(409)->assertJsonPath('code', 'activity_archived');
        $this->postJson("/api/admin/activities/{$activity->id}/unpublish")->assertStatus(409);
        $this->putJson("/api/admin/activities/{$activity->id}", ['title' => 'Changed'])->assertStatus(409);

        $this->assertFalse((bool) $activity->fresh()->is_published);
        $this->assertSame('Washing Hands', $activity->fresh()->title);
    }

    public function test_publish_and_unpublish_still_work_for_live_activities(): void
    {
        $activity = $this->activity('Washing Hands', false);
        Sanctum::actingAs($this->user('admin'));

        $this->postJson("/api/admin/activities/{$activity->id}/publish")->assertOk()->assertJsonPath('data.is_published', true);
        $this->getJson('/api/activities')->assertJsonCount(1, 'data');
        $this->postJson("/api/admin/activities/{$activity->id}/unpublish")->assertOk()->assertJsonPath('data.is_published', false);
        $this->getJson('/api/activities')->assertJsonCount(0, 'data');
    }

    public function test_permanent_deletion_removes_progress_and_only_unshared_files(): void
    {
        Storage::fake('local');
        $disk = Storage::disk('local');
        $child = $this->child();
        $doomed = $this->activity('Doomed', true);
        $keeper = $this->activity('Keeper', true);

        foreach (['own', 'shared'] as $name) {
            $disk->put("activity-materials/{$name}.txt", 'x');
        }
        foreach ([[$doomed, 'own'], [$doomed, 'shared'], [$keeper, 'shared']] as [$a, $name]) {
            ActivityResource::create(['activity_id' => $a->id, 'title' => $name, 'file_name' => "{$name}.txt", 'file_path' => "activity-materials/{$name}.txt", 'file_type' => 'txt']);
        }
        $disk->put('activity-images/pic.png', 'x');
        $doomed->forceFill(['image_path' => 'activity-images/pic.png'])->save();

        ActivityProgress::create(['child_id' => $child->id, 'activity_id' => $doomed->id, 'status' => 'completed', 'completed_at' => now()]);
        $keptProgress = ActivityProgress::create(['child_id' => $child->id, 'activity_id' => $keeper->id, 'status' => 'completed', 'completed_at' => now()]);

        Sanctum::actingAs($this->user('admin'));
        $this->postJson("/api/admin/activities/{$doomed->id}/archive")->assertOk();
        $this->deleteJson("/api/admin/activities/{$doomed->id}")->assertOk();

        $this->assertDatabaseMissing('activities', ['id' => $doomed->id]);
        $this->assertSame(0, ActivityProgress::where('activity_id', $doomed->id)->count());
        $this->assertDatabaseMissing('activity_resources', ['activity_id' => $doomed->id]);
        $disk->assertMissing('activity-materials/own.txt');
        $disk->assertMissing('activity-images/pic.png');
        // The file another activity still uses is kept.
        $disk->assertExists('activity-materials/shared.txt');
        $this->assertDatabaseHas('activity_resources', ['activity_id' => $keeper->id]);
        $this->assertNotNull($keptProgress->fresh());
        $this->assertNotNull($keeper->fresh());
        $this->assertNotNull($child->fresh());
    }

    public function test_only_admins_can_archive_restore_or_delete(): void
    {
        $activity = $this->activity('Washing Hands', true);
        $archived = $this->activity('Old', false);
        $archived->forceFill(['archived_at' => now(), 'archived_was_published' => false])->save();

        $calls = [
            ['postJson', "/api/admin/activities/{$activity->id}/archive"],
            ['postJson', "/api/admin/activities/{$archived->id}/restore"],
            ['deleteJson', "/api/admin/activities/{$archived->id}"],
            ['getJson', '/api/admin/activities?archived=1'],
        ];

        foreach ($calls as [$method, $url]) {
            $this->{$method}($url)->assertUnauthorized();
        }

        Sanctum::actingAs($this->user('parent'));
        foreach ($calls as [$method, $url]) {
            $this->{$method}($url)->assertForbidden();
        }

        $this->assertNull($activity->fresh()->archived_at);
        $this->assertNotNull($archived->fresh()->archived_at);
    }

    public function test_activity_ids_are_validated(): void
    {
        Sanctum::actingAs($this->user('admin'));

        $this->postJson('/api/admin/activities/99999/archive')->assertNotFound();
        $this->postJson('/api/admin/activities/99999/restore')->assertNotFound();
        $this->postJson('/api/admin/activities/abc/archive')->assertNotFound();
    }
}
