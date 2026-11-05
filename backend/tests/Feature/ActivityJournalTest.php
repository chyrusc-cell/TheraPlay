<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityJournalEntry;
use App\Models\ActivityProgress;
use App\Models\Category;
use App\Models\Child;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The session journal (1-5 rating + observations) and the admin Activity Feedback list.
 */
class ActivityJournalTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function parent(string $email = 'p@example.com', bool $verified = true): User
    {
        $user = User::create(['name' => 'Pat Parent', 'email' => $email, 'password' => 'password123']);
        $user->forceFill(['role' => 'parent', 'email_verified_at' => $verified ? now() : null])->save();

        return $user;
    }

    private function admin(): User
    {
        $user = User::create(['name' => 'Admin', 'email' => 'admin@example.com', 'password' => 'password123']);
        $user->forceFill(['role' => 'admin', 'email_verified_at' => now()])->save();

        return $user;
    }

    private function child(User $parent, string $name = 'Sam'): Child
    {
        return Child::create(['user_id' => $parent->id, 'name' => $name]);
    }

    private function activity(string $title = 'Button Practice'): Activity
    {
        $category = Category::firstOrCreate(['name' => 'Fine Motor Skills']);

        return Activity::create([
            'category_id' => $category->id,
            'title' => $title,
            'objective' => 'Practice.',
            'instructions' => ['Step one'],
            'materials' => ['Board'],
            'is_published' => true,
        ]);
    }

    private function act(User $user): void
    {
        $this->app['auth']->forgetGuards();
        Sanctum::actingAs($user);
    }

    /** Completes an activity for a child through the real endpoint; returns the progress id. */
    private function complete(User $parent, Child $child, Activity $activity): int
    {
        $this->act($parent);

        return (int) $this->postJson("/api/activities/{$activity->id}/complete", ['child_id' => $child->id])
            ->assertSuccessful()->json('data.record.id');
    }

    private function journal(User $parent, int $progressId, array $body)
    {
        $this->act($parent);

        return $this->postJson("/api/progress/{$progressId}/journal", $body);
    }

    // ---------------------------------------------------------------- saving

    public function test_a_parent_saves_a_rating_and_note_for_a_completed_session(): void
    {
        $parent = $this->parent();
        $child = $this->child($parent);
        $activity = $this->activity();
        $progress = $this->complete($parent, $child, $activity);

        $this->journal($parent, $progress, ['rating' => 4, 'note' => "  He stayed focused for 10 minutes.\nStruggled with the small buttons.  "])
            ->assertCreated()
            ->assertJsonPath('data.entry.rating', 4)
            ->assertJsonPath('data.entry.child_id', $child->id)
            ->assertJsonPath('data.entry.activity_id', $activity->id);

        $entry = ActivityJournalEntry::firstOrFail();
        $this->assertSame("He stayed focused for 10 minutes.\nStruggled with the small buttons.", $entry->note);
        $this->assertSame($progress, $entry->activity_progress_id);
        $this->assertEquals(ActivityProgress::find($progress)->completed_at, $entry->session_completed_at);
    }

    public function test_the_note_is_optional_but_the_rating_is_required_and_limited_to_1_to_5(): void
    {
        $parent = $this->parent();
        $progress = $this->complete($parent, $this->child($parent), $this->activity());

        $this->journal($parent, $progress, ['note' => 'only a note'])->assertStatus(422)->assertJsonValidationErrors('rating');
        $this->journal($parent, $progress, ['rating' => 0])->assertStatus(422)->assertJsonValidationErrors('rating');
        $this->journal($parent, $progress, ['rating' => 6])->assertStatus(422)->assertJsonValidationErrors('rating');
        $this->journal($parent, $progress, ['rating' => 'five'])->assertStatus(422)->assertJsonValidationErrors('rating');
        $this->journal($parent, $progress, ['rating' => 3, 'note' => str_repeat('a', 5001)])->assertStatus(422)->assertJsonValidationErrors('note');

        $this->assertSame(0, ActivityJournalEntry::count());

        $this->journal($parent, $progress, ['rating' => 5, 'note' => '   '])->assertCreated();
        $this->assertNull(ActivityJournalEntry::firstOrFail()->note);
    }

    public function test_a_long_note_up_to_the_limit_is_accepted(): void
    {
        $parent = $this->parent();
        $progress = $this->complete($parent, $this->child($parent), $this->activity());

        $this->journal($parent, $progress, ['rating' => 3, 'note' => str_repeat('a', 5000)])->assertCreated();
    }

    public function test_the_same_session_cannot_be_saved_twice_and_the_first_note_is_kept(): void
    {
        $parent = $this->parent();
        $progress = $this->complete($parent, $this->child($parent), $this->activity());

        $this->journal($parent, $progress, ['rating' => 5, 'note' => 'first'])->assertCreated();
        $this->journal($parent, $progress, ['rating' => 1, 'note' => 'second'])
            ->assertStatus(409)->assertJsonPath('code', 'journal_exists');

        $this->assertSame(1, ActivityJournalEntry::count());
        $this->assertSame('first', ActivityJournalEntry::firstOrFail()->note);
    }

    public function test_an_activity_that_is_not_completed_cannot_get_an_entry(): void
    {
        $parent = $this->parent();
        $child = $this->child($parent);
        $progress = ActivityProgress::create([
            'child_id' => $child->id, 'activity_id' => $this->activity()->id, 'status' => 'in_progress',
        ]);

        $this->journal($parent, $progress->id, ['rating' => 5])->assertStatus(409)->assertJsonPath('code', 'not_completed');
        $this->assertSame(0, ActivityJournalEntry::count());
    }

    // ---------------------------------------------------------------- sessions and history

    public function test_completing_again_after_an_undo_does_not_allow_a_second_entry(): void
    {
        $parent = $this->parent();
        $child = $this->child($parent);
        $activity = $this->activity();

        Carbon::setTestNow('2026-11-01 10:00:00');
        $progress = $this->complete($parent, $child, $activity);
        $this->journal($parent, $progress, ['rating' => 2, 'note' => 'session one'])->assertCreated();

        $this->act($parent);
        $this->postJson("/api/progress/{$progress}/undo")->assertOk();

        Carbon::setTestNow('2026-11-08 10:00:00');
        $again = $this->complete($parent, $child, $activity);
        $this->assertSame($progress, $again, 'the same progress row is reused');
        $this->journal($parent, $again, ['rating' => 5, 'note' => 'session two'])
            ->assertStatus(409)->assertJsonPath('code', 'journal_exists');

        // Only the first entry exists; it can be edited instead.
        $this->assertSame(1, ActivityJournalEntry::count());
        $entry = ActivityJournalEntry::firstOrFail();
        $this->assertSame('session one', $entry->note);

        $this->act($parent);
        $this->putJson("/api/journal/{$entry->id}", ['rating' => 5, 'note' => 'edited'])->assertOk();
        $this->assertSame('edited', $entry->fresh()->note);

        // After deleting it the activity can be journaled again (still only one).
        $this->deleteJson("/api/journal/{$entry->id}")->assertOk();
        $this->journal($parent, $again, ['rating' => 4])->assertCreated();
        $this->journal($parent, $again, ['rating' => 1])->assertStatus(409);
        $this->assertSame(1, ActivityJournalEntry::count());
    }

    public function test_entries_of_two_children_never_mix(): void
    {
        $parent = $this->parent();
        $sam = $this->child($parent, 'Sam');
        $ava = $this->child($parent, 'Ava');
        $activity = $this->activity();

        $this->journal($parent, $this->complete($parent, $sam, $activity), ['rating' => 5, 'note' => 'Sam note'])->assertCreated();
        $this->journal($parent, $this->complete($parent, $ava, $activity), ['rating' => 1, 'note' => 'Ava note'])->assertCreated();

        $this->act($parent);
        $this->getJson("/api/activities/{$activity->id}/journal?child_id={$sam->id}")
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.note', 'Sam note');
        $this->getJson("/api/activities/{$activity->id}/journal?child_id={$ava->id}")
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.note', 'Ava note');
    }

    public function test_an_activity_without_entries_returns_an_empty_list(): void
    {
        $parent = $this->parent();
        $child = $this->child($parent);
        $activity = $this->activity();
        $this->complete($parent, $child, $activity); // old-style completion without a journal

        $this->act($parent);
        $this->getJson("/api/activities/{$activity->id}/journal?child_id={$child->id}")
            ->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_undoing_a_completion_keeps_the_journal_entry(): void
    {
        $parent = $this->parent();
        $progress = $this->complete($parent, $this->child($parent), $this->activity());
        $this->journal($parent, $progress, ['rating' => 4])->assertCreated();

        $this->act($parent);
        $this->postJson("/api/progress/{$progress}/undo")->assertOk();

        $this->assertSame(1, ActivityJournalEntry::count());
        $this->assertSame('not_started', ActivityProgress::find($progress)->status);
    }

    // ---------------------------------------------------------------- ownership and roles

    public function test_another_parents_progress_record_is_a_404(): void
    {
        $owner = $this->parent('owner@example.com');
        $other = $this->parent('other@example.com');
        $progress = $this->complete($owner, $this->child($owner), $this->activity());

        $this->journal($other, $progress, ['rating' => 5])->assertNotFound();
        $this->assertSame(0, ActivityJournalEntry::count());
    }

    public function test_another_parents_child_cannot_be_read(): void
    {
        $owner = $this->parent('owner@example.com');
        $other = $this->parent('other@example.com');
        $child = $this->child($owner);
        $activity = $this->activity();
        $this->journal($owner, $this->complete($owner, $child, $activity), ['rating' => 5, 'note' => 'private'])->assertCreated();

        $this->act($other);
        $this->getJson("/api/activities/{$activity->id}/journal?child_id={$child->id}")->assertNotFound();
    }

    public function test_guests_unverified_parents_and_admins_cannot_save_entries(): void
    {
        $parent = $this->parent();
        $progress = $this->complete($parent, $this->child($parent), $this->activity());

        $this->app['auth']->forgetGuards();
        $this->postJson("/api/progress/{$progress}/journal", ['rating' => 5])->assertUnauthorized();

        $parent->forceFill(['email_verified_at' => null])->save();
        $this->journal($parent->fresh(), $progress, ['rating' => 5])
            ->assertForbidden()->assertJsonPath('code', 'email_not_verified');

        $this->journal($this->admin(), $progress, ['rating' => 5])->assertForbidden();

        $this->assertSame(0, ActivityJournalEntry::count());
    }

    public function test_saving_entries_is_rate_limited(): void
    {
        $parent = $this->parent();
        $progress = $this->complete($parent, $this->child($parent), $this->activity());

        for ($i = 0; $i < 20; $i++) {
            $this->journal($parent, $progress, ['rating' => 0]);
        }

        $this->journal($parent, $progress, ['rating' => 0])->assertStatus(429);
    }

    // ---------------------------------------------------------------- edit and delete

    private function entryFor(User $parent, ?Child $child = null): array
    {
        $child ??= $this->child($parent);
        $progress = $this->complete($parent, $child, $this->activity());
        $this->journal($parent, $progress, ['rating' => 3, 'note' => 'first'])->assertCreated();

        return [ActivityJournalEntry::firstOrFail(), $child];
    }

    public function test_a_parent_can_edit_their_entry_and_the_session_stays_the_same(): void
    {
        $parent = $this->parent();
        [$entry] = $this->entryFor($parent);
        $session = $entry->session_completed_at;

        $this->act($parent);
        $this->putJson("/api/journal/{$entry->id}", ['rating' => 5, 'note' => '  better now  '])
            ->assertOk()->assertJsonPath('data.entry.rating', 5)->assertJsonPath('data.entry.note', 'better now');

        $entry->refresh();
        $this->assertSame(5, $entry->rating);
        $this->assertEquals($session, $entry->session_completed_at);
        $this->assertSame(1, ActivityJournalEntry::count());
    }

    public function test_editing_validates_the_rating_and_note(): void
    {
        $parent = $this->parent();
        [$entry] = $this->entryFor($parent);

        $this->act($parent);
        $this->putJson("/api/journal/{$entry->id}", ['note' => 'x'])->assertStatus(422)->assertJsonValidationErrors('rating');
        $this->putJson("/api/journal/{$entry->id}", ['rating' => 9])->assertStatus(422);
        $this->putJson("/api/journal/{$entry->id}", ['rating' => 3, 'note' => str_repeat('a', 5001)])->assertStatus(422);
        $this->assertSame('first', $entry->fresh()->note);
    }

    public function test_a_parent_can_delete_their_entry_and_only_that_one(): void
    {
        $parent = $this->parent();
        $child = $this->child($parent);
        $a = $this->activity('A');
        $b = $this->activity('B');
        $this->journal($parent, $this->complete($parent, $child, $a), ['rating' => 3])->assertCreated();
        $this->journal($parent, $this->complete($parent, $child, $b), ['rating' => 4])->assertCreated();
        $target = ActivityJournalEntry::where('activity_id', $a->id)->firstOrFail();

        $this->act($parent);
        $this->deleteJson("/api/journal/{$target->id}")->assertOk();

        $this->assertSame(1, ActivityJournalEntry::count());
        $this->assertSame($b->id, ActivityJournalEntry::firstOrFail()->activity_id);
        $this->assertSame('completed', ActivityProgress::where('activity_id', $a->id)->firstOrFail()->status);
    }

    public function test_after_deleting_the_session_can_be_journaled_again(): void
    {
        $parent = $this->parent();
        [$entry] = $this->entryFor($parent);
        $progress = $entry->activity_progress_id;

        $this->act($parent);
        $this->deleteJson("/api/journal/{$entry->id}")->assertOk();
        $this->journal($parent, $progress, ['rating' => 2])->assertCreated();
    }

    public function test_other_parents_admins_guests_and_unverified_cannot_edit_or_delete(): void
    {
        $owner = $this->parent('owner@example.com');
        [$entry] = $this->entryFor($owner);
        $other = $this->parent('other@example.com');

        $this->act($other);
        $this->putJson("/api/journal/{$entry->id}", ['rating' => 1])->assertNotFound();
        $this->deleteJson("/api/journal/{$entry->id}")->assertNotFound();

        $this->act($this->admin());
        $this->putJson("/api/journal/{$entry->id}", ['rating' => 1])->assertForbidden();
        $this->deleteJson("/api/journal/{$entry->id}")->assertForbidden();

        $this->app['auth']->forgetGuards();
        $this->deleteJson("/api/journal/{$entry->id}")->assertUnauthorized();

        $owner->forceFill(['email_verified_at' => null])->save();
        $this->act($owner->fresh());
        $this->putJson("/api/journal/{$entry->id}", ['rating' => 1])->assertForbidden();
        $this->deleteJson("/api/journal/{$entry->id}")->assertForbidden();

        $this->assertSame(3, $entry->fresh()->rating);
        $this->assertSame(1, ActivityJournalEntry::count());
    }

    // ---------------------------------------------------------------- admin Activity Feedback

    public function test_admin_sees_entries_newest_first_with_the_right_names(): void
    {
        $parent = $this->parent();
        $sam = $this->child($parent, 'Sam');
        $a = $this->activity('Buttons');
        $b = $this->activity('Beads');

        Carbon::setTestNow('2026-11-01 09:00:00');
        $this->journal($parent, $this->complete($parent, $sam, $a), ['rating' => 3, 'note' => 'older'])->assertCreated();
        Carbon::setTestNow('2026-11-05 09:00:00');
        $this->journal($parent, $this->complete($parent, $sam, $b), ['rating' => 5, 'note' => 'newer'])->assertCreated();

        $this->act($this->admin());
        $response = $this->getJson('/api/admin/activity-feedback')->assertOk();

        $response->assertJsonPath('data.0.note', 'newer')
            ->assertJsonPath('data.0.rating', 5)
            ->assertJsonPath('data.0.activity.title', 'Beads')
            ->assertJsonPath('data.0.child.name', 'Sam')
            ->assertJsonPath('data.0.user.name', 'Pat Parent')
            ->assertJsonPath('data.1.note', 'older')
            ->assertJsonPath('meta.total', 2);

        $this->assertStringNotContainsString('p@example.com', $response->getContent());
    }

    public function test_the_admin_list_is_paginated(): void
    {
        $parent = $this->parent();
        $child = $this->child($parent);

        foreach (range(1, 12) as $i) {
            $activity = $this->activity("Activity {$i}");
            $this->journal($parent, $this->complete($parent, $child, $activity), ['rating' => 3])->assertCreated();
        }

        $this->act($this->admin());
        $this->getJson('/api/admin/activity-feedback?per_page=5')
            ->assertOk()->assertJsonCount(5, 'data')->assertJsonPath('meta.last_page', 3)->assertJsonPath('meta.total', 12);
        $this->getJson('/api/admin/activity-feedback?per_page=500')->assertOk()->assertJsonPath('meta.per_page', 50);
    }

    public function test_only_admins_can_list_activity_feedback(): void
    {
        $this->getJson('/api/admin/activity-feedback')->assertUnauthorized();

        $this->act($this->parent());
        $this->getJson('/api/admin/activity-feedback')->assertForbidden();
    }

    public function test_an_admin_cannot_write_or_change_entries(): void
    {
        $parent = $this->parent();
        $progress = $this->complete($parent, $this->child($parent), $this->activity());
        $this->journal($parent, $progress, ['rating' => 4, 'note' => 'mine'])->assertCreated();
        $id = ActivityJournalEntry::firstOrFail()->id;

        $this->act($this->admin());
        $this->postJson('/api/admin/activity-feedback', ['rating' => 1])->assertStatus(405);
        $this->putJson("/api/admin/activity-feedback/{$id}", ['rating' => 1])->assertStatus(404);
        $this->deleteJson("/api/admin/activity-feedback/{$id}")->assertStatus(404);

        $this->assertSame('mine', ActivityJournalEntry::firstOrFail()->note);
    }

    public function test_purging_an_activity_removes_its_entries_with_its_progress(): void
    {
        $parent = $this->parent();
        $activity = $this->activity();
        $this->journal($parent, $this->complete($parent, $this->child($parent), $activity), ['rating' => 4])->assertCreated();

        $activity->purge();

        $this->assertSame(0, ActivityJournalEntry::count());
    }
}
