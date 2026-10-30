<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityProgress;
use App\Models\ActivityResource;
use App\Models\Category;
use App\Models\Child;
use App\Models\Condition;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminActivityManagementTest extends TestCase
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

    private function makeAdmin(string $email = 'admin@example.com'): User
    {
        return $this->makeUser($email, 'admin');
    }

    private function makeActivity(string $title = 'Button Practice', bool $published = true, ?User $owner = null): Activity
    {
        $activity = new Activity([
            'title' => $title,
            'instructions' => ['Step one'],
            'materials' => ['Board'],
            'is_published' => $published,
        ]);
        $activity->created_by = $owner?->id;
        $activity->save();

        return $activity;
    }

    private function validPayload(array $extra = []): array
    {
        return array_merge([
            'title' => 'Bead Threading',
            'description' => 'Thread beads onto a string.',
            'objective' => 'Improve hand-eye coordination.',
            'instructions' => ['Pick up a bead.', 'Thread it.'],
            'materials' => ['Beads', 'String'],
            'difficulty' => 'Medium',
        ], $extra);
    }

    // --- Access control: every management endpoint ---

    private function endpoints(Activity $activity): array
    {
        return [
            ['getJson', '/api/admin/activities'],
            ['postJson', '/api/admin/activities'],
            ['getJson', "/api/admin/activities/{$activity->id}"],
            ['putJson', "/api/admin/activities/{$activity->id}"],
            ['patchJson', "/api/admin/activities/{$activity->id}"],
            ['postJson', "/api/admin/activities/{$activity->id}/publish"],
            ['postJson', "/api/admin/activities/{$activity->id}/unpublish"],
        ];
    }

    public function test_guests_are_rejected_with_401_on_every_endpoint(): void
    {
        $activity = $this->makeActivity();

        foreach ($this->endpoints($activity) as [$method, $url]) {
            $this->$method($url, $this->validPayload())->assertUnauthorized();
        }

        $this->assertSame(1, Activity::count());
    }

    public function test_parents_are_rejected_with_403_on_every_endpoint(): void
    {
        $activity = $this->makeActivity(published: false);
        Sanctum::actingAs($this->makeUser('parent@example.com'));

        foreach ($this->endpoints($activity) as [$method, $url]) {
            $this->$method($url, $this->validPayload(['title' => 'Hacked']))->assertForbidden();
        }

        $fresh = $activity->fresh();
        $this->assertSame('Button Practice', $fresh->title);
        $this->assertFalse($fresh->is_published);
        $this->assertSame(1, Activity::count());
    }

    // --- Listing and viewing ---

    public function test_admin_list_includes_published_and_unpublished_activities(): void
    {
        $this->makeActivity('Published One', true);
        $this->makeActivity('Draft One', false);
        Sanctum::actingAs($this->makeAdmin());

        $response = $this->getJson('/api/admin/activities')->assertOk();

        $this->assertEqualsCanonicalizing(
            ['Published One', 'Draft One'],
            collect($response->json('data'))->pluck('title')->all()
        );
    }

    public function test_admin_can_view_an_unpublished_activity(): void
    {
        $draft = $this->makeActivity('Draft One', false);
        Sanctum::actingAs($this->makeAdmin());

        $this->getJson("/api/admin/activities/{$draft->id}")
            ->assertOk()
            ->assertJsonPath('data.title', 'Draft One')
            ->assertJsonPath('data.is_published', false);

        $this->getJson('/api/admin/activities/9999')->assertNotFound();
    }

    // --- Create ---

    public function test_admin_can_create_a_valid_activity_owned_by_themselves(): void
    {
        $admin = $this->makeAdmin();
        $category = Category::create(['name' => 'Fine Motor']);
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/admin/activities', $this->validPayload([
            'category_id' => $category->id,
        ]))
            ->assertCreated()
            ->assertJsonPath('data.title', 'Bead Threading')
            ->assertJsonPath('data.category', 'Fine Motor')
            ->assertJsonPath('data.created_by', $admin->id)
            ->assertJsonPath('data.is_published', false)
            ->assertJsonPath('data.instructions', ['Pick up a bead.', 'Thread it.']);

        $this->assertDatabaseHas('activities', [
            'id' => $response->json('data.id'),
            'created_by' => $admin->id,
            'is_published' => false,
        ]);
    }

    public function test_client_supplied_created_by_and_publish_flag_are_ignored_on_create(): void
    {
        $admin = $this->makeAdmin();
        $other = $this->makeAdmin('other@example.com');
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/admin/activities', $this->validPayload([
            'created_by' => $other->id,
            'is_published' => true,
            'id' => 999,
        ]))->assertCreated();

        $this->assertSame($admin->id, $response->json('data.created_by'));
        $this->assertFalse($response->json('data.is_published'));
        $this->assertNotSame(999, $response->json('data.id'));
    }

    public function test_invalid_input_returns_422_and_creates_nothing(): void
    {
        Sanctum::actingAs($this->makeAdmin());

        $bad = [
            'missing everything' => [],
            'empty title' => ['title' => ''],
            'title too long' => ['title' => str_repeat('a', 256)],
            'no instructions' => ['instructions' => []],
            'instructions not an array' => ['instructions' => 'Do it'],
            'blank instruction' => ['instructions' => ['']],
            'materials missing' => ['materials' => null],
            'bad difficulty' => ['difficulty' => 'Impossible'],
            'unknown category' => ['category_id' => 9999],
            'non-numeric category' => ['category_id' => 'abc'],
            'description too long' => ['description' => str_repeat('a', 5001)],
        ];

        foreach ($bad as $case => $override) {
            $payload = $case === 'missing everything'
                ? []
                : $this->validPayload($override);

            if ($case === 'materials missing') {
                unset($payload['materials']);
            }

            $this->postJson('/api/admin/activities', $payload)
                ->assertStatus(422, "Expected 422 for case: {$case}");
        }

        $this->assertSame(0, Activity::count());
    }

    public function test_materials_may_be_an_empty_list(): void
    {
        Sanctum::actingAs($this->makeAdmin());

        $this->postJson('/api/admin/activities', $this->validPayload(['materials' => []]))
            ->assertCreated()
            ->assertJsonPath('data.materials', []);
    }

    // --- Update ---

    public function test_admin_can_update_an_activity_without_changing_its_owner(): void
    {
        $creator = $this->makeAdmin('creator@example.com');
        $editor = $this->makeAdmin('editor@example.com');
        $activity = $this->makeActivity('Old Title', false, $creator);
        Sanctum::actingAs($editor);

        $this->putJson("/api/admin/activities/{$activity->id}", $this->validPayload([
            'title' => 'New Title',
            'created_by' => $editor->id,
            'is_published' => true,
        ]))
            ->assertOk()
            ->assertJsonPath('data.title', 'New Title')
            ->assertJsonPath('data.created_by', $creator->id)
            ->assertJsonPath('data.is_published', false);

        $fresh = $activity->fresh();
        $this->assertSame('New Title', $fresh->title);
        $this->assertSame($creator->id, $fresh->created_by);
        $this->assertFalse($fresh->is_published);
    }

    public function test_patch_allows_partial_updates_and_validates_what_is_sent(): void
    {
        $activity = $this->makeActivity('Keep Me');
        Sanctum::actingAs($this->makeAdmin());

        $this->patchJson("/api/admin/activities/{$activity->id}", ['difficulty' => 'Hard'])
            ->assertOk()
            ->assertJsonPath('data.difficulty', 'Hard')
            ->assertJsonPath('data.title', 'Keep Me');

        $this->patchJson("/api/admin/activities/{$activity->id}", ['title' => ''])
            ->assertStatus(422);

        $this->patchJson("/api/admin/activities/{$activity->id}", ['difficulty' => 'Nope'])
            ->assertStatus(422);

        $this->assertSame('Keep Me', $activity->fresh()->title);
    }

    public function test_updating_a_missing_activity_returns_404(): void
    {
        Sanctum::actingAs($this->makeAdmin());

        $this->putJson('/api/admin/activities/9999', $this->validPayload())->assertNotFound();
    }

    // --- Publish / unpublish and the public API ---

    public function test_admin_can_publish_and_unpublish_and_the_public_api_follows(): void
    {
        $draft = $this->makeActivity('Soon Public', false);

        // Draft: hidden from both public endpoints.
        $this->getJson('/api/activities')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson("/api/activities/{$draft->id}")->assertNotFound();

        Sanctum::actingAs($this->makeAdmin());

        $this->postJson("/api/admin/activities/{$draft->id}/publish")
            ->assertOk()
            ->assertJsonPath('data.is_published', true);

        $this->getJson('/api/activities')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/activities/{$draft->id}")->assertOk();

        $this->postJson("/api/admin/activities/{$draft->id}/unpublish")
            ->assertOk()
            ->assertJsonPath('data.is_published', false);

        $this->getJson('/api/activities')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson("/api/activities/{$draft->id}")->assertNotFound();
    }

    public function test_public_endpoints_never_expose_unpublished_activities(): void
    {
        $published = $this->makeActivity('Visible', true);
        $draft = $this->makeActivity('Hidden', false);

        $list = $this->getJson('/api/activities')->assertOk();

        $this->assertSame(['Visible'], collect($list->json('data'))->pluck('title')->all());
        $this->getJson("/api/activities/{$published->id}")->assertOk();
        $this->getJson("/api/activities/{$draft->id}")->assertNotFound();
    }

    // --- Permanent deletion (progress is deleted with the activity) ---

    private function makeProgress(Child $child, Activity $activity): ActivityProgress
    {
        return ActivityProgress::create([
            'child_id' => $child->id,
            'activity_id' => $activity->id,
            'status' => 'completed',
            'completed_at' => now(),
        ]);
    }

    private function makeResource(Activity $activity, string $path): ActivityResource
    {
        Storage::disk('local')->put($path, 'x');

        return ActivityResource::create([
            'activity_id' => $activity->id,
            'title' => 'Sheet',
            'file_name' => 'sheet.txt',
            'file_path' => $path,
            'file_type' => 'txt',
        ]);
    }

    public function test_an_admin_can_delete_an_activity_that_has_no_progress(): void
    {
        $admin = $this->makeAdmin();
        $activity = $this->makeActivity();
        Sanctum::actingAs($admin);

        $this->deleteJson("/api/admin/activities/{$activity->id}")
            ->assertOk()
            ->assertJsonPath('message', 'Activity deleted.');

        $this->assertDatabaseMissing('activities', ['id' => $activity->id]);
    }

    public function test_an_admin_can_delete_an_activity_with_progress_and_the_progress_goes_too(): void
    {
        Storage::fake('local');
        $admin = $this->makeAdmin();
        $parent = $this->makeUser('parent@example.com');
        $child = Child::create(['user_id' => $parent->id, 'name' => 'Kid']);
        $sibling = Child::create(['user_id' => $parent->id, 'name' => 'Sibling']);
        $activity = $this->makeActivity();
        $this->makeProgress($child, $activity);
        $this->makeProgress($sibling, $activity);
        $condition = Condition::create(['name' => 'Autism']);
        $activity->conditions()->attach($condition->id);
        $resource = $this->makeResource($activity, 'activity-materials/sheet.txt');
        Sanctum::actingAs($admin);

        $this->deleteJson("/api/admin/activities/{$activity->id}")->assertOk();

        $this->assertDatabaseMissing('activities', ['id' => $activity->id]);
        $this->assertSame(0, ActivityProgress::where('activity_id', $activity->id)->count());
        $this->assertSame(0, ActivityProgress::count());
        $this->assertDatabaseMissing('activity_resources', ['id' => $resource->id]);
        $this->assertDatabaseMissing('activity_condition', ['activity_id' => $activity->id]);
        Storage::disk('local')->assertMissing('activity-materials/sheet.txt');
        // The children, their parent and the shared condition are still there.
        $this->assertNotNull($child->fresh());
        $this->assertNotNull($sibling->fresh());
        $this->assertNotNull($parent->fresh());
        $this->assertNotNull($condition->fresh());
    }

    public function test_deleting_one_activity_leaves_other_activities_and_their_progress(): void
    {
        Storage::fake('local');
        $admin = $this->makeAdmin();
        $parent = $this->makeUser('parent@example.com');
        $child = Child::create(['user_id' => $parent->id, 'name' => 'Kid']);
        $doomed = $this->makeActivity('Doomed');
        $kept = $this->makeActivity('Kept');
        $this->makeProgress($child, $doomed);
        $keptProgress = $this->makeProgress($child, $kept);
        $this->makeResource($kept, 'activity-materials/kept.txt');
        Sanctum::actingAs($admin);

        $this->deleteJson("/api/admin/activities/{$doomed->id}")->assertOk();

        $this->assertNotNull($kept->fresh());
        $this->assertNotNull($keptProgress->fresh());
        $this->assertSame(1, ActivityProgress::count());
        $this->assertSame(1, ActivityResource::count());
        Storage::disk('local')->assertExists('activity-materials/kept.txt');
    }

    public function test_deleting_a_missing_activity_returns_404(): void
    {
        Sanctum::actingAs($this->makeAdmin());

        $this->deleteJson('/api/admin/activities/99999')->assertNotFound();
    }

    public function test_guests_and_parents_cannot_delete_an_activity(): void
    {
        $parent = $this->makeUser('parent@example.com');
        $child = Child::create(['user_id' => $parent->id, 'name' => 'Kid']);
        $activity = $this->makeActivity();
        $this->makeProgress($child, $activity);

        $this->deleteJson("/api/admin/activities/{$activity->id}")->assertUnauthorized();

        Sanctum::actingAs($parent);
        $this->deleteJson("/api/admin/activities/{$activity->id}")->assertForbidden();

        $this->assertNotNull($activity->fresh());
        $this->assertSame(1, ActivityProgress::count());
    }

    public function test_a_failed_deletion_rolls_everything_back(): void
    {
        Storage::fake('local');
        $admin = $this->makeAdmin();
        $parent = $this->makeUser('parent@example.com');
        $child = Child::create(['user_id' => $parent->id, 'name' => 'Kid']);
        $activity = $this->makeActivity();
        $this->makeProgress($child, $activity);
        $this->makeResource($activity, 'activity-materials/sheet.txt');
        // The last step fails, after the progress and resource rows were deleted.
        Activity::deleting(fn () => throw new \RuntimeException('boom'));
        Sanctum::actingAs($admin);

        $this->deleteJson("/api/admin/activities/{$activity->id}")->assertStatus(500);

        $this->assertNotNull($activity->fresh());
        $this->assertSame(1, ActivityProgress::count());
        $this->assertSame(1, ActivityResource::count());
        // The uploaded file is kept, because the database was rolled back.
        Storage::disk('local')->assertExists('activity-materials/sheet.txt');
    }
}
