<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityProgress;
use App\Models\Category;
use App\Models\Child;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UndoCompletionTest extends TestCase
{
    use RefreshDatabase;

    private function parent(string $email): User
    {
        $user = User::create(['name' => 'P', 'email' => $email, 'password' => 'password123', 'role' => 'parent']);
        $user->forceFill(['email_verified_at' => now()])->save();

        return $user;
    }

    private function activity(string $title = 'Buttons'): Activity
    {
        $category = Category::firstOrCreate(['name' => 'Fine Motor Skills']);

        return Activity::create([
            'category_id' => $category->id, 'title' => $title, 'objective' => 'o',
            'instructions' => ['s'], 'materials' => ['m'], 'is_published' => true,
        ]);
    }

    /** @return array{0: User, 1: Child, 2: ActivityProgress} */
    private function completedRecord(string $email = 'a@example.com', array $extra = []): array
    {
        $user = $this->parent($email);
        $child = Child::create(['user_id' => $user->id, 'name' => 'Kid']);
        $record = ActivityProgress::create(array_merge([
            'child_id' => $child->id, 'activity_id' => $this->activity()->id,
            'status' => 'completed', 'completed_at' => now(),
        ], $extra));

        return [$user, $child, $record];
    }

    public function test_a_parent_can_undo_a_completion_of_their_own_child(): void
    {
        [$user, , $record] = $this->completedRecord();
        Sanctum::actingAs($user);

        $this->postJson("/api/progress/{$record->id}/undo")
            ->assertOk()
            ->assertJsonPath('data.record.status', 'not_started')
            ->assertJsonPath('data.record.completed_at', null);

        $record->refresh();
        $this->assertSame('not_started', $record->status);
        $this->assertNull($record->completed_at);
        // The row is kept, not deleted.
        $this->assertDatabaseCount('activity_progress', 1);
    }

    public function test_a_started_activity_goes_back_to_in_progress(): void
    {
        [$user, , $record] = $this->completedRecord(extra: ['started_at' => now()->subDay()]);
        Sanctum::actingAs($user);

        $this->postJson("/api/progress/{$record->id}/undo")
            ->assertOk()->assertJsonPath('data.record.status', 'in_progress');
    }

    public function test_undo_changes_nothing_else(): void
    {
        [$user, $child, $record] = $this->completedRecord();
        $other = ActivityProgress::create([
            'child_id' => $child->id, 'activity_id' => $this->activity('Other')->id,
            'status' => 'completed', 'completed_at' => now(),
        ]);
        Sanctum::actingAs($user);

        $this->postJson("/api/progress/{$record->id}/undo")->assertOk();

        $this->assertSame('completed', $other->fresh()->status);
    }

    public function test_the_activity_can_be_completed_again_after_an_undo(): void
    {
        [$user, $child, $record] = $this->completedRecord();
        Sanctum::actingAs($user);

        $this->postJson("/api/progress/{$record->id}/undo")->assertOk();
        $this->postJson("/api/activities/{$record->activity_id}/complete", ['child_id' => $child->id])->assertSuccessful();

        $this->assertSame('completed', $record->fresh()->status);
        $this->assertDatabaseCount('activity_progress', 1);
    }

    public function test_another_parents_record_is_a_404_and_stays_completed(): void
    {
        [, , $record] = $this->completedRecord('owner@example.com');
        Sanctum::actingAs($this->parent('intruder@example.com'));

        $this->postJson("/api/progress/{$record->id}/undo")->assertNotFound();

        $this->assertSame('completed', $record->fresh()->status);
    }

    public function test_unknown_and_malformed_ids_are_rejected(): void
    {
        [$user] = $this->completedRecord();
        Sanctum::actingAs($user);

        $this->postJson('/api/progress/99999/undo')->assertNotFound();
        $this->postJson('/api/progress/abc/undo')->assertNotFound();
    }

    public function test_repeating_the_request_is_harmless(): void
    {
        [$user, , $record] = $this->completedRecord();
        Sanctum::actingAs($user);

        $this->postJson("/api/progress/{$record->id}/undo")->assertOk();
        $this->postJson("/api/progress/{$record->id}/undo")
            ->assertOk()
            ->assertJsonPath('data.record.status', 'not_started')
            ->assertJsonPath('message', 'This activity is not marked as completed.');
    }

    public function test_undo_keeps_the_start_time_and_the_progress_list_shows_the_new_state(): void
    {
        [$user, $child, $record] = $this->completedRecord(extra: ['started_at' => now()->subDay()->startOfSecond()]);
        $started = $record->started_at->toIso8601String();
        Sanctum::actingAs($user);

        $this->postJson("/api/progress/{$record->id}/undo")->assertOk();

        $this->assertSame($started, $record->fresh()->started_at->toIso8601String());

        $this->getJson("/api/progress?child_id={$child->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data.records')
            ->assertJsonPath('data.records.0.status', 'in_progress')
            ->assertJsonPath('data.records.0.completed_at', null);
    }

    public function test_a_record_that_is_not_completed_is_never_changed(): void
    {
        $user = $this->parent('b.com');
        $child = Child::create(['user_id' => $user->id, 'name' => 'Kid']);
        $started = ActivityProgress::create([
            'child_id' => $child->id, 'activity_id' => $this->activity('One')->id,
            'status' => 'in_progress', 'started_at' => now()->subHour(),
        ]);
        $fresh = ActivityProgress::create([
            'child_id' => $child->id, 'activity_id' => $this->activity('Two')->id,
            'status' => 'not_started',
        ]);
        Sanctum::actingAs($user);

        $this->postJson("/api/progress/{$started->id}/undo")
            ->assertOk()->assertJsonPath('data.record.status', 'in_progress');
        $this->postJson("/api/progress/{$fresh->id}/undo")
            ->assertOk()->assertJsonPath('data.record.status', 'not_started');

        $this->assertSame('in_progress', $started->fresh()->status);
        $this->assertNotNull($started->fresh()->started_at);
        $this->assertSame('not_started', $fresh->fresh()->status);
    }

    public function test_the_second_child_of_the_same_parent_can_be_undone_but_not_a_strangers(): void
    {
        [$user, , ] = $this->completedRecord('c.com');
        $second = Child::create(['user_id' => $user->id, 'name' => 'Second']);
        $mine = ActivityProgress::create([
            'child_id' => $second->id, 'activity_id' => $this->activity('Three')->id,
            'status' => 'completed', 'completed_at' => now(),
        ]);
        [, , $theirs] = $this->completedRecord('d.com');
        Sanctum::actingAs($user);

        $this->postJson("/api/progress/{$mine->id}/undo")->assertOk();
        $this->postJson("/api/progress/{$theirs->id}/undo")->assertNotFound();

        $this->assertSame('completed', $theirs->fresh()->status);
    }

    public function test_guests_and_admins_cannot_undo(): void
    {
        [, , $record] = $this->completedRecord();

        $this->postJson("/api/progress/{$record->id}/undo")->assertUnauthorized();

        $admin = User::create(['name' => 'A', 'email' => 'admin@example.com', 'password' => 'password123']);
        $admin->forceFill(['role' => 'admin'])->save();
        Sanctum::actingAs($admin->fresh());
        $this->postJson("/api/progress/{$record->id}/undo")->assertForbidden();

        $this->assertSame('completed', $record->fresh()->status);
    }
}
