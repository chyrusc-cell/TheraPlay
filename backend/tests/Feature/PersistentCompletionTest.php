<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityProgress;
use App\Models\Child;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PersistentCompletionTest extends TestCase
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

    private function makeParentWithChild(string $email): array
    {
        $parent = $this->makeUser($email);
        $child = Child::create(['user_id' => $parent->id, 'name' => 'Kid']);

        return [$parent, $child];
    }

    private function makeActivity(string $title = 'Button Practice', bool $published = true): Activity
    {
        $activity = new Activity([
            'title' => $title,
            'instructions' => ['Step one'],
            'materials' => [],
        ]);
        $activity->is_published = $published;
        $activity->save();

        return $activity;
    }

    public function test_guests_cannot_mark_an_activity_complete(): void
    {
        $activity = $this->makeActivity();

        $this->postJson("/api/activities/{$activity->id}/complete")->assertUnauthorized();

        $this->assertSame(0, ActivityProgress::count());
    }

    public function test_admins_cannot_record_completion(): void
    {
        $activity = $this->makeActivity();
        $admin = $this->makeUser('admin@example.com', 'admin');
        Child::create(['user_id' => $admin->id, 'name' => 'Admin Kid']);
        Sanctum::actingAs($admin);

        $this->postJson("/api/activities/{$activity->id}/complete")->assertForbidden();

        $this->assertSame(0, ActivityProgress::count());
    }

    public function test_completion_persists_and_is_returned_by_the_progress_endpoint(): void
    {
        [$parent] = $this->makeParentWithChild('parent@example.com');
        $done = $this->makeActivity('Done One');
        $open = $this->makeActivity('Still Open');
        Sanctum::actingAs($parent);

        $this->postJson("/api/activities/{$done->id}/complete")
            ->assertCreated()
            ->assertJsonPath('data.record.status', 'completed');

        // A later request (what a page refresh or a new login does) still
        // sees it, and sees nothing for the other activity.
        $records = $this->getJson('/api/progress')->assertOk()->json('data.records');

        $completedIds = collect($records)->where('status', 'completed')->pluck('activity_id')->all();

        $this->assertSame([$done->id], $completedIds);
        $this->assertNotContains($open->id, collect($records)->pluck('activity_id')->all());
    }

    public function test_completion_survives_logging_out_and_back_in(): void
    {
        [$parent] = $this->makeParentWithChild('parent@example.com');
        $activity = $this->makeActivity();

        $first = $parent->createToken('first')->plainTextToken;
        $this->withToken($first)->postJson("/api/activities/{$activity->id}/complete")->assertCreated();
        $this->withToken($first)->postJson('/api/logout')->assertOk();
        $this->app['auth']->forgetGuards();

        $login = $this->postJson('/api/login', [
            'email' => 'parent@example.com',
            'password' => 'password123',
        ])->assertOk();

        $this->withToken($login->json('token'))
            ->getJson('/api/progress')
            ->assertOk()
            ->assertJsonPath('data.records.0.status', 'completed')
            ->assertJsonPath('data.records.0.activity_id', $activity->id);
    }

    public function test_repeated_requests_do_not_create_duplicate_records(): void
    {
        [$parent, $child] = $this->makeParentWithChild('parent@example.com');
        $activity = $this->makeActivity();
        Sanctum::actingAs($parent);

        $first = $this->postJson("/api/activities/{$activity->id}/complete")->assertCreated();
        $completedAt = $first->json('data.record.completed_at');

        foreach (range(1, 3) as $ignored) {
            $this->postJson("/api/activities/{$activity->id}/complete")
                ->assertOk()
                ->assertJsonPath('data.record.id', $first->json('data.record.id'))
                ->assertJsonPath('data.record.completed_at', $completedAt);
        }

        $this->assertSame(
            1,
            ActivityProgress::where('child_id', $child->id)->where('activity_id', $activity->id)->count()
        );
    }

    public function test_a_parent_cannot_change_another_parents_progress(): void
    {
        [$me, $myChild] = $this->makeParentWithChild('me@example.com');
        [$other, $otherChild] = $this->makeParentWithChild('other@example.com');
        $activity = $this->makeActivity();
        Sanctum::actingAs($me);

        // Forged identifiers in the request body are ignored.
        $this->postJson("/api/activities/{$activity->id}/complete", [
            'child_id' => $otherChild->id,
            'user_id' => $other->id,
        ])->assertCreated();

        $this->assertSame(1, ActivityProgress::where('child_id', $myChild->id)->count());
        $this->assertSame(0, ActivityProgress::where('child_id', $otherChild->id)->count());

        // And each parent only ever reads their own records.
        $this->getJson('/api/progress')->assertOk()->assertJsonCount(1, 'data.records');

        $this->app['auth']->forgetGuards();
        Sanctum::actingAs($other);
        $this->getJson('/api/progress')->assertOk()->assertJsonCount(0, 'data.records');
    }

    public function test_the_same_activity_is_tracked_separately_for_each_parent(): void
    {
        [$a] = $this->makeParentWithChild('a@example.com');
        [$b] = $this->makeParentWithChild('b@example.com');
        $activity = $this->makeActivity();

        Sanctum::actingAs($a);
        $this->postJson("/api/activities/{$activity->id}/complete")->assertCreated();

        $this->app['auth']->forgetGuards();
        Sanctum::actingAs($b);
        $this->postJson("/api/activities/{$activity->id}/complete")->assertCreated();

        $this->assertSame(2, ActivityProgress::count());
    }

    public function test_unpublished_activities_cannot_be_completed(): void
    {
        [$parent] = $this->makeParentWithChild('parent@example.com');
        $draft = $this->makeActivity('Hidden', published: false);
        Sanctum::actingAs($parent);

        $this->postJson("/api/activities/{$draft->id}/complete")->assertNotFound();

        $this->assertSame(0, ActivityProgress::count());
    }

    public function test_an_activity_unpublished_after_completion_keeps_the_saved_progress(): void
    {
        [$parent] = $this->makeParentWithChild('parent@example.com');
        $activity = $this->makeActivity();
        Sanctum::actingAs($parent);

        $this->postJson("/api/activities/{$activity->id}/complete")->assertCreated();
        $activity->update(['is_published' => false]);

        $this->getJson('/api/progress')
            ->assertOk()
            ->assertJsonPath('data.records.0.status', 'completed');
        $this->postJson("/api/activities/{$activity->id}/complete")->assertNotFound();
        $this->assertSame(1, ActivityProgress::count());
    }

    public function test_a_parent_without_a_child_profile_gets_a_clear_error(): void
    {
        $activity = $this->makeActivity();
        Sanctum::actingAs($this->makeUser('parent@example.com'));

        $this->postJson("/api/activities/{$activity->id}/complete")
            ->assertStatus(422)
            ->assertJsonPath('code', 'child_profile_required');

        $this->assertSame(0, ActivityProgress::count());
    }

    public function test_public_activity_responses_never_include_progress(): void
    {
        [$parent] = $this->makeParentWithChild('parent@example.com');
        $activity = $this->makeActivity();
        Sanctum::actingAs($parent);
        $this->postJson("/api/activities/{$activity->id}/complete")->assertCreated();

        $list = $this->getJson('/api/activities')->assertOk()->getContent();
        $detail = $this->getJson("/api/activities/{$activity->id}")->assertOk()->getContent();

        foreach ([$list, $detail] as $body) {
            $this->assertStringNotContainsString('completed', $body);
            $this->assertStringNotContainsString('child', $body);
        }
    }
}
