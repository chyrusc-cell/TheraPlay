<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoryManagementTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $role): User
    {
        $user = User::create(['name' => ucfirst($role), 'email' => $role.'@example.com', 'password' => 'password123']);
        $user->forceFill(['role' => $role])->save();

        return $user;
    }

    private function admin(): User
    {
        return $this->user('admin');
    }

    private function activityIn(Category $category, bool $published = true): Activity
    {
        $activity = Activity::create([
            'title' => 'Activity '.$category->id,
            'description' => 'Something to do',
            'instructions' => ['Do it together'],
            'materials' => [],
            'difficulty' => 'Easy',
            'category_id' => $category->id,
        ]);
        $activity->forceFill(['is_published' => $published])->save();

        return $activity;
    }

    public function test_only_admins_can_manage_categories(): void
    {
        $this->getJson('/api/admin/categories')->assertUnauthorized();

        $this->actingAs($this->user('parent'), 'sanctum');
        $this->getJson('/api/admin/categories')->assertForbidden();
        $this->postJson('/api/admin/categories', ['name' => 'Speech'])->assertForbidden();
        $this->assertDatabaseMissing('categories', ['name' => 'Speech']);
    }

    public function test_an_admin_can_add_rename_and_list_categories_with_usage_counts(): void
    {
        $this->actingAs($this->admin(), 'sanctum');

        $id = $this->postJson('/api/admin/categories', ['name' => '  Speech  ', 'description' => 'Talking'])
            ->assertCreated()
            ->assertJsonPath('data.name', 'Speech')
            ->assertJsonPath('data.activities_count', 0)
            ->json('data.id');

        $this->putJson("/api/admin/categories/{$id}", ['name' => 'Speech & Language'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Speech & Language')
            ->assertJsonPath('data.description', 'Talking');

        $this->activityIn(Category::find($id));

        $this->getJson('/api/admin/categories')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Speech & Language')
            ->assertJsonPath('data.0.activities_count', 1);
    }

    public function test_duplicate_and_blank_names_are_rejected_ignoring_letter_case(): void
    {
        $this->actingAs($this->admin(), 'sanctum');
        $memory = Category::create(['name' => 'Memory']);
        $motor = Category::create(['name' => 'Motor']);

        $this->postJson('/api/admin/categories', ['name' => 'memory'])
            ->assertStatus(422)->assertJsonValidationErrors('name');
        $this->postJson('/api/admin/categories', ['name' => '   '])
            ->assertStatus(422)->assertJsonValidationErrors('name');
        $this->putJson("/api/admin/categories/{$motor->id}", ['name' => 'MEMORY'])
            ->assertStatus(422)->assertJsonValidationErrors('name');

        // Saving a category under its own name (even in another case) is fine.
        $this->putJson("/api/admin/categories/{$memory->id}", ['name' => 'MEMORY'])->assertOk();
        $this->assertSame(2, Category::count());
    }

    public function test_a_category_in_use_cannot_be_deleted_and_its_activities_keep_it(): void
    {
        $this->actingAs($this->admin(), 'sanctum');
        $category = Category::create(['name' => 'Memory']);
        $activity = $this->activityIn($category, published: false);

        $this->deleteJson("/api/admin/categories/{$category->id}")
            ->assertStatus(409)
            ->assertJsonPath('message', fn ($message) => str_contains($message, '1 activity'));

        $this->assertDatabaseHas('categories', ['id' => $category->id]);
        $this->assertSame($category->id, $activity->fresh()->category_id);
    }

    public function test_an_unused_category_can_be_deleted(): void
    {
        $this->actingAs($this->admin(), 'sanctum');
        $category = Category::create(['name' => 'Unused']);

        $this->deleteJson("/api/admin/categories/{$category->id}")->assertOk();
        $this->assertDatabaseMissing('categories', ['id' => $category->id]);
    }

    public function test_managing_categories_does_not_change_which_activities_are_published(): void
    {
        $this->actingAs($this->admin(), 'sanctum');
        $category = Category::create(['name' => 'Memory']);
        $published = $this->activityIn($category, published: true);
        $draft = $this->activityIn($category, published: false);

        $this->putJson("/api/admin/categories/{$category->id}", ['name' => 'Memory Skills'])->assertOk();

        $this->assertTrue((bool) $published->fresh()->is_published);
        $this->assertFalse((bool) $draft->fresh()->is_published);
        $this->getJson('/api/activities')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.category', 'Memory Skills');
    }
}
