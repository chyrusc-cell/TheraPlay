<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityProgress;
use App\Models\Category;
use App\Models\Child;
use App\Models\Condition;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ChildrenAndConditionsTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role, string $email): User
    {
        $user = User::create(['name' => ucfirst($role), 'email' => $email, 'password' => 'password123']);
        $user->forceFill(['role' => $role])->save();

        return $user;
    }

    private function parent(string $email = 'parent@example.com'): User
    {
        return $this->user('parent', $email);
    }

    private function actAs(User $user): void
    {
        $this->app['auth']->forgetGuards();
        Sanctum::actingAs($user);
    }

    private function condition(string $name, bool $active = true): Condition
    {
        return Condition::create(['name' => $name, 'is_active' => $active]);
    }

    private function activity(string $title, array $attrs = [], array $conditions = []): Activity
    {
        $activity = new Activity(array_merge([
            'title' => $title,
            'instructions' => ['Step'],
            'materials' => [],
            'difficulty' => 'Easy',
        ], $attrs));
        $activity->is_published = $attrs['is_published'] ?? true;
        $activity->save();
        $activity->conditions()->sync(collect($conditions)->map->id->all());

        return $activity;
    }

    private function registration(array $extra = []): array
    {
        return array_merge([
            'first_name' => 'Pat',
            'last_name' => 'Parent',
            'email' => 'new@example.com',
            'phone' => '0917 000 0000',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ], $extra);
    }

    // ---------------- Registration with the first child ----------------

    public function test_registration_creates_the_parent_and_the_first_child_together(): void
    {
        $adhd = $this->condition('ADHD');
        $dob = now()->subYears(5)->toDateString();

        $this->postJson('/api/register', $this->registration([
            'child' => ['name' => ' Sam ', 'date_of_birth' => $dob, 'condition_ids' => [$adhd->id]],
        ]))->assertCreated();

        $parent = User::where('email', 'new@example.com')->firstOrFail();
        $child = $parent->children()->firstOrFail();

        $this->assertSame('Sam', $child->name);
        $this->assertSame($dob, $child->date_of_birth->toDateString());
        $this->assertSame([$adhd->id], $child->conditions()->pluck('conditions.id')->all());
    }

    public function test_registration_without_a_child_still_works_for_api_clients(): void
    {
        $this->postJson('/api/register', $this->registration())->assertCreated();

        $this->assertSame(0, Child::count());
    }

    public function test_invalid_child_information_rejects_the_whole_registration(): void
    {
        $inactive = $this->condition('Old', false);
        $url = '/api/register';

        $this->postJson($url, $this->registration(['child' => ['date_of_birth' => '2020-01-01']]))
            ->assertStatus(422)->assertJsonValidationErrors('child.name');
        $this->postJson($url, $this->registration(['child' => ['name' => 'Sam', 'date_of_birth' => now()->addDay()->toDateString()]]))
            ->assertStatus(422)->assertJsonValidationErrors('child.date_of_birth');
        $this->postJson($url, $this->registration(['child' => ['name' => 'Sam', 'date_of_birth' => now()->subYears(40)->toDateString()]]))
            ->assertStatus(422)->assertJsonValidationErrors('child.date_of_birth');
        $this->postJson($url, $this->registration(['child' => ['name' => 'Sam', 'date_of_birth' => 'not a date']]))
            ->assertStatus(422)->assertJsonValidationErrors('child.date_of_birth');
        $this->postJson($url, $this->registration(['child' => ['name' => 'Sam', 'condition_ids' => [9999]]]))
            ->assertStatus(422)->assertJsonValidationErrors('child.condition_ids.0');
        $this->postJson($url, $this->registration(['child' => ['name' => 'Sam', 'condition_ids' => [$inactive->id]]]))
            ->assertStatus(422);

        // Nothing partial was created.
        $this->assertSame(0, User::count());
        $this->assertSame(0, Child::count());
    }

    public function test_registration_ignores_a_forged_parent_id(): void
    {
        $victim = $this->parent('victim@example.com');

        $this->postJson('/api/register', $this->registration([
            'child' => ['name' => 'Sam', 'user_id' => $victim->id],
        ]))->assertCreated();

        $this->assertSame(0, $victim->children()->count());
        $this->assertSame(1, User::where('email', 'new@example.com')->firstOrFail()->children()->count());
    }

    // ---------------- Managing children ----------------

    public function test_a_parent_can_add_edit_and_list_several_children(): void
    {
        $parent = $this->parent();
        $a = $this->condition('A');
        $b = $this->condition('B');
        $this->actAs($parent);

        $first = $this->postJson('/api/children', ['name' => 'One', 'condition_ids' => [$a->id, $b->id]])->assertCreated();
        $this->postJson('/api/children', ['name' => 'Two', 'date_of_birth' => now()->subYears(3)->toDateString()])->assertCreated();

        $id = $first->json('data.child.id');
        $this->putJson("/api/children/{$id}", ['name' => 'One Renamed', 'condition_ids' => [$b->id]])->assertOk();

        $list = $this->getJson('/api/children')->assertOk()->assertJsonCount(2, 'data');
        $this->assertSame('One Renamed', $list->json('data.0.name'));
        $this->assertSame([$b->id], collect($list->json('data.0.conditions'))->pluck('id')->all());
    }

    public function test_a_parent_cannot_see_edit_or_delete_another_parents_child(): void
    {
        $me = $this->parent('me@example.com');
        $other = $this->parent('other@example.com');
        $theirs = Child::create(['user_id' => $other->id, 'name' => 'Theirs']);
        $this->actAs($me);

        $this->getJson('/api/children')->assertOk()->assertJsonCount(0, 'data');
        $this->putJson("/api/children/{$theirs->id}", ['name' => 'Hacked'])->assertNotFound();
        $this->deleteJson("/api/children/{$theirs->id}")->assertNotFound();

        $this->assertSame('Theirs', $theirs->fresh()->name);
    }

    public function test_children_validation(): void
    {
        $this->actAs($this->parent());

        $this->postJson('/api/children', ['name' => '   '])->assertStatus(422)->assertJsonValidationErrors('name');
        $this->postJson('/api/children', ['name' => 'X', 'date_of_birth' => now()->addYear()->toDateString()])->assertStatus(422);
        $this->postJson('/api/children', ['name' => 'X', 'condition_ids' => [1, 1]])->assertStatus(422);
        $this->assertSame(0, Child::count());
    }

    public function test_a_child_with_progress_cannot_be_deleted_but_an_empty_one_can(): void
    {
        $parent = $this->parent();
        $withHistory = Child::create(['user_id' => $parent->id, 'name' => 'History']);
        $empty = Child::create(['user_id' => $parent->id, 'name' => 'Empty']);
        $activity = $this->activity('Memory');
        ActivityProgress::create(['child_id' => $withHistory->id, 'activity_id' => $activity->id, 'status' => 'completed', 'completed_at' => now()]);
        $this->actAs($parent);

        $this->deleteJson("/api/children/{$withHistory->id}")->assertStatus(422)->assertJsonPath('code', 'child_has_progress');
        $this->assertSame(1, ActivityProgress::count());

        $this->deleteJson("/api/children/{$empty->id}")->assertOk();
        $this->assertNull(Child::find($empty->id));
    }

    public function test_admins_and_guests_cannot_use_the_children_endpoints(): void
    {
        $this->getJson('/api/children')->assertUnauthorized();
        $this->postJson('/api/children', ['name' => 'X'])->assertUnauthorized();

        $this->actAs($this->user('admin', 'admin@example.com'));
        $this->getJson('/api/children')->assertForbidden();
        $this->postJson('/api/children', ['name' => 'X'])->assertForbidden();
    }

    // ---------------- Conditions ----------------

    public function test_parents_only_get_active_conditions_to_choose_from(): void
    {
        $this->condition('Active One');
        $this->condition('Switched Off', false);

        $names = collect($this->getJson('/api/conditions')->assertOk()->json('data'))->pluck('name')->all();

        $this->assertSame(['Active One'], $names);
    }

    public function test_an_inactive_condition_cannot_be_newly_selected_but_old_links_survive_edits(): void
    {
        $parent = $this->parent();
        $keep = $this->condition('Will Be Switched Off');
        $other = $this->condition('Other');
        $child = Child::create(['user_id' => $parent->id, 'name' => 'Sam']);
        $child->conditions()->sync([$keep->id]);
        $keep->update(['is_active' => false]);
        $this->actAs($parent);

        // Offered no more as a new choice...
        $this->postJson('/api/children', ['name' => 'New', 'condition_ids' => [$keep->id]])->assertStatus(422);
        // ...but an edit that does not mention it keeps the old link.
        $this->putJson("/api/children/{$child->id}", ['name' => 'Sam', 'condition_ids' => [$other->id]])->assertOk();

        $this->assertEqualsCanonicalizing([$keep->id, $other->id], $child->conditions()->pluck('conditions.id')->all());
    }

    public function test_admins_can_manage_conditions_and_nobody_else_can(): void
    {
        $this->actAs($this->user('admin', 'admin@example.com'));

        $created = $this->postJson('/api/admin/conditions', ['name' => 'Dyslexia', 'description' => 'Reading'])->assertCreated();
        $id = $created->json('data.id');
        $this->postJson('/api/admin/conditions', ['name' => 'Dyslexia'])->assertStatus(422)->assertJsonValidationErrors('name');

        $this->putJson("/api/admin/conditions/{$id}", ['name' => 'Dyslexia (reading)', 'is_active' => false])
            ->assertOk()->assertJsonPath('data.is_active', false);
        $this->getJson('/api/admin/conditions')->assertOk()->assertJsonPath('data.0.name', 'Dyslexia (reading)');
        $this->assertSame([], $this->getJson('/api/conditions')->json('data'));

        // No delete route on purpose.
        $this->deleteJson("/api/admin/conditions/{$id}")->assertStatus(405);

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/admin/conditions')->assertUnauthorized();
        $this->postJson('/api/admin/conditions', ['name' => 'X'])->assertUnauthorized();

        $this->actAs($this->parent());
        $this->getJson('/api/admin/conditions')->assertForbidden();
        $this->postJson('/api/admin/conditions', ['name' => 'X'])->assertForbidden();
        $this->putJson("/api/admin/conditions/{$id}", ['name' => 'X'])->assertForbidden();
    }

    // ---------------- Activities and conditions ----------------

    public function test_admins_assign_conditions_to_activities_and_ids_are_validated(): void
    {
        $a = $this->condition('A');
        $b = $this->condition('B');
        $this->actAs($this->user('admin', 'admin@example.com'));

        $created = $this->postJson('/api/admin/activities', [
            'title' => 'Matching', 'instructions' => ['Go'], 'materials' => [],
            'difficulty' => 'Easy', 'condition_ids' => [$a->id, $b->id], 'is_for_all_conditions' => false,
        ])->assertCreated();
        $id = $created->json('data.id');
        $this->assertEqualsCanonicalizing([$a->id, $b->id], $created->json('data.condition_ids'));

        $this->putJson("/api/admin/activities/{$id}", ['condition_ids' => [$b->id]])->assertOk()->assertJsonPath('data.condition_ids', [$b->id]);
        // Not sending condition_ids leaves them alone.
        $this->putJson("/api/admin/activities/{$id}", ['title' => 'Renamed'])->assertOk()->assertJsonPath('data.condition_ids', [$b->id]);
        $this->putJson("/api/admin/activities/{$id}", ['condition_ids' => []])->assertOk()->assertJsonPath('data.condition_ids', []);

        $this->putJson("/api/admin/activities/{$id}", ['condition_ids' => [9999]])->assertStatus(422)->assertJsonValidationErrors('condition_ids.0');
        $this->putJson("/api/admin/activities/{$id}", ['condition_ids' => [$a->id, $a->id]])->assertStatus(422);
        $this->putJson("/api/admin/activities/{$id}", ['is_for_all_conditions' => true])->assertOk()->assertJsonPath('data.is_for_all_conditions', true);
    }

    public function test_parents_cannot_assign_conditions_to_activities(): void
    {
        $a = $this->condition('A');
        $activity = $this->activity('Open');
        $this->actAs($this->parent());

        $this->putJson("/api/admin/activities/{$activity->id}", ['condition_ids' => [$a->id]])->assertForbidden();
        $this->assertSame(0, $activity->conditions()->count());
    }

    // ---------------- Browsing activities (conditions do NOT filter) ----------------

    public function test_parents_see_every_published_activity_whatever_their_childs_conditions(): void
    {
        $parent = $this->parent();
        $a = $this->condition('A');
        $b = $this->condition('B');
        $c = $this->condition('C');
        $child = Child::create(['user_id' => $parent->id, 'name' => 'Sam']);
        $child->conditions()->sync([$a->id]);

        $this->activity('Matches A', [], [$a]);
        $this->activity('Only B', [], [$b]);
        $this->activity('A and C', [], [$a, $c]);
        $this->activity('Unassigned');
        $this->activity('For everyone', ['is_for_all_conditions' => true]);
        $this->activity('Draft A', ['is_published' => false], [$a]);
        $this->activity('Draft unassigned', ['is_published' => false]);
        $this->actAs($parent);

        $titles = collect($this->getJson('/api/activities')->assertOk()->json('data'))->pluck('title')->all();

        $this->assertEqualsCanonicalizing(['Matches A', 'Only B', 'A and C', 'Unassigned', 'For everyone'], $titles);
        $this->assertNotContains('Draft A', $titles);
        $this->assertNotContains('Draft unassigned', $titles);
    }

    public function test_a_child_with_no_conditions_or_a_parent_with_no_child_still_sees_the_activities(): void
    {
        $parent = $this->parent();
        Child::create(['user_id' => $parent->id, 'name' => 'No conditions yet']);
        $this->activity('Open to all');
        $this->actAs($parent);

        $this->getJson('/api/activities')->assertOk()->assertJsonCount(1, 'data');

        $this->actAs($this->parent('childless@example.com'));
        $this->getJson('/api/activities')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_the_list_is_the_same_for_guests_parents_and_admins_and_ignores_a_child_id(): void
    {
        $other = $this->parent('other@example.com');
        $theirs = Child::create(['user_id' => $other->id, 'name' => 'Theirs']);
        $a = $this->condition('A');
        $this->activity('One', [], [$a]);
        $this->activity('Two');
        $this->activity('Hidden', ['is_published' => false]);

        $this->getJson('/api/activities')->assertOk()->assertJsonCount(2, 'data');

        $this->actAs($this->parent());
        // A leftover child_id (even someone else's) neither filters nor leaks anything.
        $this->getJson("/api/activities?child_id={$theirs->id}")->assertOk()->assertJsonCount(2, 'data');

        $this->actAs($this->user('admin', 'admin@example.com'));
        $this->getJson('/api/activities')->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_the_list_carries_category_and_difficulty_for_the_page_filters(): void
    {
        $memory = Category::create(['name' => 'Memory']);
        $motor = Category::create(['name' => 'Motor']);
        $this->activity('Easy memory', ['difficulty' => 'Easy', 'category_id' => $memory->id]);
        $this->activity('Hard memory', ['difficulty' => 'Hard', 'category_id' => $memory->id]);
        $this->activity('Easy motor', ['difficulty' => 'Easy', 'category_id' => $motor->id]);
        $this->activity('No category', ['difficulty' => 'Medium']);

        $rows = collect($this->getJson('/api/activities')->assertOk()->json('data'));

        $this->assertEqualsCanonicalizing(['Easy memory', 'Hard memory'], $rows->where('category', 'Memory')->pluck('title')->all());
        $this->assertEqualsCanonicalizing(['Easy memory', 'Easy motor'], $rows->where('difficulty', 'Easy')->pluck('title')->all());
        $this->assertSame(['Easy memory'], $rows->where('category', 'Memory')->where('difficulty', 'Easy')->pluck('title')->all());
        $this->assertSame([], $rows->where('category', 'Motor')->where('difficulty', 'Hard')->pluck('title')->all());
        $this->assertSame([null], $rows->where('title', 'No category')->pluck('category')->all());
    }

    public function test_conditions_and_their_assignments_still_work_even_though_they_do_not_filter(): void
    {
        $a = $this->condition('A');
        $activity = $this->activity('Assigned', [], [$a]);

        $this->actAs($this->user('admin', 'admin@example.com'));
        $this->getJson("/api/admin/activities/{$activity->id}")->assertOk()->assertJsonPath('data.condition_ids', [$a->id]);
        $this->getJson('/api/admin/conditions')->assertOk()->assertJsonPath('data.0.activities_count', 1);
    }

    // ---------------- Progress per child ----------------

    public function test_progress_and_completion_are_kept_separate_for_each_child(): void
    {
        $parent = $this->parent();
        $one = Child::create(['user_id' => $parent->id, 'name' => 'One']);
        $two = Child::create(['user_id' => $parent->id, 'name' => 'Two']);
        $activity = $this->activity('Shared');
        $this->actAs($parent);

        // With several children the child must be named.
        $this->postJson("/api/activities/{$activity->id}/complete")->assertStatus(422)->assertJsonValidationErrors('child_id');
        $this->getJson('/api/progress')->assertStatus(422);

        $this->postJson("/api/activities/{$activity->id}/complete", ['child_id' => $one->id])->assertCreated();

        $this->assertSame(1, ActivityProgress::where('child_id', $one->id)->count());
        $this->assertSame(0, ActivityProgress::where('child_id', $two->id)->count());
        $this->getJson("/api/progress?child_id={$one->id}")->assertOk()->assertJsonCount(1, 'data.records');
        $this->getJson("/api/progress?child_id={$two->id}")->assertOk()->assertJsonCount(0, 'data.records');

        // Completing for the second child does not touch the first.
        $this->postJson("/api/activities/{$activity->id}/complete", ['child_id' => $two->id])->assertCreated();
        $this->assertSame(2, ActivityProgress::count());
    }

    public function test_history_survives_changes_to_a_childs_conditions(): void
    {
        $parent = $this->parent();
        $a = $this->condition('A');
        $child = Child::create(['user_id' => $parent->id, 'name' => 'Sam']);
        $child->conditions()->sync([$a->id]);
        $activity = $this->activity('Mine', [], [$a]);
        $this->actAs($parent);

        $this->postJson("/api/activities/{$activity->id}/complete", ['child_id' => $child->id])->assertCreated();
        $this->putJson("/api/children/{$child->id}", ['name' => 'Sam', 'condition_ids' => []])->assertOk();

        $this->getJson("/api/progress?child_id={$child->id}")->assertOk()->assertJsonCount(1, 'data.records');
    }

    public function test_an_unpublished_activity_cannot_be_completed(): void
    {
        $parent = $this->parent();
        $child = Child::create(['user_id' => $parent->id, 'name' => 'Sam']);
        $draft = $this->activity('Draft', ['is_published' => false]);
        $this->actAs($parent);

        $this->postJson("/api/activities/{$draft->id}/complete", ['child_id' => $child->id])->assertNotFound();
        $this->assertSame(0, ActivityProgress::count());
    }

    // ---------------- Editing a child (update) ----------------

    public function test_updating_a_child_changes_only_that_child_and_persists_conditions(): void
    {
        $parent = $this->parent();
        $a = $this->condition('A');
        $b = $this->condition('B');
        $one = Child::create(['user_id' => $parent->id, 'name' => 'One', 'date_of_birth' => '2020-01-01']);
        $two = Child::create(['user_id' => $parent->id, 'name' => 'Two']);
        $one->conditions()->sync([$a->id]);
        $two->conditions()->sync([$a->id, $b->id]);
        $this->actAs($parent);

        $this->putJson("/api/children/{$one->id}", [
            'name' => ' One Renamed ',
            'date_of_birth' => '2021-02-03',
            'condition_ids' => [$b->id],
        ])
            ->assertOk()
            ->assertJsonPath('data.child.name', 'One Renamed')
            ->assertJsonPath('data.child.date_of_birth', '2021-02-03')
            ->assertJsonPath('data.child.conditions.0.id', $b->id);

        $one = $one->fresh();
        $this->assertSame('One Renamed', $one->name);
        $this->assertSame([$b->id], $one->conditions()->pluck('conditions.id')->all());

        // The sibling is untouched.
        $two = $two->fresh();
        $this->assertSame('Two', $two->name);
        $this->assertNull($two->date_of_birth);
        $this->assertEqualsCanonicalizing([$a->id, $b->id], $two->conditions()->pluck('conditions.id')->all());
    }

    public function test_clearing_the_date_and_all_conditions_is_saved(): void
    {
        $parent = $this->parent();
        $a = $this->condition('A');
        $child = Child::create(['user_id' => $parent->id, 'name' => 'Sam', 'date_of_birth' => '2020-01-01']);
        $child->conditions()->sync([$a->id]);
        $this->actAs($parent);

        $this->putJson("/api/children/{$child->id}", ['name' => 'Sam', 'date_of_birth' => null, 'condition_ids' => []])
            ->assertOk()->assertJsonPath('data.child.conditions', []);

        $this->assertNull($child->fresh()->date_of_birth);
        $this->assertSame(0, $child->conditions()->count());
    }

    public function test_a_child_with_saved_progress_can_still_be_edited(): void
    {
        $parent = $this->parent();
        $child = Child::create(['user_id' => $parent->id, 'name' => 'History']);
        $activity = $this->activity('Memory');
        ActivityProgress::create(['child_id' => $child->id, 'activity_id' => $activity->id, 'status' => 'completed', 'completed_at' => now()]);
        $this->actAs($parent);

        $this->putJson("/api/children/{$child->id}", ['name' => 'History Renamed'])->assertOk();

        $this->assertSame('History Renamed', $child->fresh()->name);
        $this->assertSame(1, ActivityProgress::where('child_id', $child->id)->count());
    }

    public function test_updating_validates_name_date_and_conditions_and_changes_nothing_on_failure(): void
    {
        $parent = $this->parent();
        $a = $this->condition('A');
        $off = $this->condition('Off', false);
        $child = Child::create(['user_id' => $parent->id, 'name' => 'Sam', 'date_of_birth' => '2020-01-01']);
        $child->conditions()->sync([$a->id]);
        $this->actAs($parent);
        $url = "/api/children/{$child->id}";

        $this->putJson($url, ['name' => '   '])->assertStatus(422)->assertJsonValidationErrors('name');
        $this->putJson($url, ['name' => 'X', 'date_of_birth' => now()->addDay()->toDateString()])->assertStatus(422)->assertJsonValidationErrors('date_of_birth');
        $this->putJson($url, ['name' => 'X', 'date_of_birth' => now()->subYears(30)->toDateString()])->assertStatus(422);
        $this->putJson($url, ['name' => 'X', 'condition_ids' => [9999]])->assertStatus(422)->assertJsonValidationErrors('condition_ids.0');
        $this->putJson($url, ['name' => 'X', 'condition_ids' => [$off->id]])->assertStatus(422);
        $this->putJson($url, ['name' => 'X', 'condition_ids' => 'not-an-array'])->assertStatus(422);

        $child = $child->fresh();
        $this->assertSame('Sam', $child->name);
        $this->assertSame('2020-01-01', $child->date_of_birth->toDateString());
        $this->assertSame([$a->id], $child->conditions()->pluck('conditions.id')->all());
    }

    public function test_guests_and_admins_cannot_update_or_delete_and_unknown_ids_are_404(): void
    {
        $parent = $this->parent();
        $child = Child::create(['user_id' => $parent->id, 'name' => 'Sam']);

        $this->putJson("/api/children/{$child->id}", ['name' => 'Hacked'])->assertUnauthorized();
        $this->deleteJson("/api/children/{$child->id}")->assertUnauthorized();

        $this->actAs($this->user('admin', 'admin@example.com'));
        $this->putJson("/api/children/{$child->id}", ['name' => 'Hacked'])->assertForbidden();
        $this->deleteJson("/api/children/{$child->id}")->assertForbidden();

        $this->actAs($parent);
        $this->putJson('/api/children/99999', ['name' => 'X'])->assertNotFound();
        $this->deleteJson('/api/children/99999')->assertNotFound();

        $this->assertSame('Sam', $child->fresh()->name);
    }
}
