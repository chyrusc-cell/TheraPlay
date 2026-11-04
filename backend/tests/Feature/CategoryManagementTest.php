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

    private function required(string $name): Category
    {
        return Category::where('name', $name)->firstOrFail();
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
        $this->putJson('/api/admin/categories/'.$this->required('Visual')->id, ['description' => 'x'])->assertForbidden();
        $this->deleteJson('/api/admin/categories/'.$this->required('Visual')->id)->assertForbidden();
        $this->assertDatabaseMissing('categories', ['name' => 'Speech']);
    }

    public function test_the_six_required_categories_exist_exactly_once_with_the_exact_names(): void
    {
        $this->assertSame(
            ['Executive Function', 'Fine Motor Skills', 'Functioning Skills', 'Handwriting', 'Sensory', 'Visual'],
            Category::REQUIRED_NAMES
        );

        foreach (Category::REQUIRED_NAMES as $name) {
            $this->assertSame(1, Category::where('name', $name)->count(), $name);
        }

        $this->assertSame(6, Category::count());
        $this->assertDatabaseMissing('categories', ['name' => 'Vision']);
    }

    public function test_the_ensure_migration_is_idempotent_and_only_adds_what_is_missing(): void
    {
        $visual = $this->required('Visual');
        $activity = $this->activityIn($visual);
        $this->required('Sensory')->delete();

        $migration = require database_path('migrations/2026_11_04_000001_ensure_required_categories.php');
        $migration->up();
        $migration->up();

        $this->assertSame(6, Category::count());
        $this->assertSame(1, Category::where('name', 'Sensory')->count());
        // Nothing existing was renamed, recreated or detached.
        $this->assertSame($visual->id, $this->required('Visual')->id);
        $this->assertSame($visual->id, $activity->fresh()->category_id);
    }

    public function test_an_admin_cannot_add_a_category(): void
    {
        $this->actingAs($this->admin(), 'sanctum');

        foreach (['Speech', 'Vision', 'visual', 'Sensory'] as $name) {
            $this->postJson('/api/admin/categories', ['name' => $name])
                ->assertForbidden()
                ->assertJsonPath('code', 'categories_fixed');
        }

        $this->assertSame(6, Category::count());
        $this->assertDatabaseMissing('categories', ['name' => 'Speech']);
    }

    public function test_a_required_category_cannot_be_renamed_but_its_description_can_change(): void
    {
        $this->actingAs($this->admin(), 'sanctum');
        $visual = $this->required('Visual');

        foreach (['Vision', 'VISUAL', 'visual', 'Sensory'] as $name) {
            $this->putJson("/api/admin/categories/{$visual->id}", ['name' => $name])
                ->assertStatus(422)->assertJsonValidationErrors('name');
        }

        $this->assertSame('Visual', $visual->fresh()->name);

        // Sending the unchanged name together with a new description is fine.
        $this->putJson("/api/admin/categories/{$visual->id}", ['name' => 'Visual', 'description' => 'Seeing things'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Visual')
            ->assertJsonPath('data.description', 'Seeing things');

        $this->putJson("/api/admin/categories/{$visual->id}", ['description' => null])->assertOk();
        $this->assertSame('Visual', $visual->fresh()->name);
    }

    public function test_the_categories_are_listed_with_usage_counts(): void
    {
        $this->actingAs($this->admin(), 'sanctum');
        $this->activityIn($this->required('Handwriting'));

        $rows = collect($this->getJson('/api/admin/categories')->assertOk()->json('data'));

        $this->assertEqualsCanonicalizing(Category::REQUIRED_NAMES, $rows->pluck('name')->all());
        $this->assertSame(1, $rows->firstWhere('name', 'Handwriting')['activities_count']);
        $this->assertSame(0, $rows->firstWhere('name', 'Visual')['activities_count']);
    }

    public function test_a_required_category_cannot_be_deleted_even_when_unused(): void
    {
        $this->actingAs($this->admin(), 'sanctum');

        foreach (Category::REQUIRED_NAMES as $name) {
            $this->deleteJson('/api/admin/categories/'.$this->required($name)->id)
                ->assertStatus(409)
                ->assertJsonPath('code', 'category_required');
        }

        $this->assertSame(6, Category::count());
    }

    public function test_a_stray_category_in_use_cannot_be_deleted_and_an_unused_one_can(): void
    {
        $this->actingAs($this->admin(), 'sanctum');
        $stray = Category::create(['name' => 'Leftover']);
        $activity = $this->activityIn($stray, published: false);

        $this->deleteJson("/api/admin/categories/{$stray->id}")
            ->assertStatus(409)
            ->assertJsonPath('message', fn ($message) => str_contains($message, '1 activity'));
        $this->assertSame($stray->id, $activity->fresh()->category_id);

        $activity->forceFill(['category_id' => $this->required('Sensory')->id])->save();
        $this->deleteJson("/api/admin/categories/{$stray->id}")->assertOk();
        $this->assertDatabaseMissing('categories', ['id' => $stray->id]);
    }

    public function test_managing_categories_does_not_change_which_activities_are_published(): void
    {
        $this->actingAs($this->admin(), 'sanctum');
        $category = $this->required('Executive Function');
        $published = $this->activityIn($category, published: true);
        $draft = $this->activityIn($category, published: false);

        $this->putJson("/api/admin/categories/{$category->id}", ['description' => 'Planning and memory'])->assertOk();

        $this->assertTrue((bool) $published->fresh()->is_published);
        $this->assertFalse((bool) $draft->fresh()->is_published);
        $this->getJson('/api/activities')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.category', 'Executive Function');
    }
}
