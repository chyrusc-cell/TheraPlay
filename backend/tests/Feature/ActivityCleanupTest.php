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
use Tests\TestCase;

class ActivityCleanupTest extends TestCase
{
    use RefreshDatabase;

    private function activity(string $title): Activity
    {
        return Activity::create([
            'title' => $title, 'instructions' => ['Go'], 'materials' => [],
            'difficulty' => 'Easy', 'category_id' => Category::where('name', 'Sensory')->value('id'),
        ]);
    }

    public function test_it_removes_only_the_exact_titles_with_their_progress_and_files(): void
    {
        $diskName = config('filesystems.activity_materials.disk');
        Storage::fake($diskName);
        $disk = Storage::disk($diskName);

        $parent = User::create(['name' => 'P', 'email' => 'p@example.com', 'password' => 'password123']);
        $child = Child::create(['user_id' => $parent->id, 'name' => 'Kid']);

        $test = $this->activity('Memory Match');
        $keep = $this->activity('Memory Match Deluxe');
        $other = $this->activity('Washing Hands');

        foreach ([$test, $other] as $activity) {
            ActivityProgress::create(['child_id' => $child->id, 'activity_id' => $activity->id, 'status' => 'completed', 'completed_at' => now()]);
        }

        $disk->put('activity-materials/test.pdf', 'x');
        $disk->put('activity-materials/other.pdf', 'x');
        ActivityResource::create(['activity_id' => $test->id, 'title' => 'T', 'file_name' => 'a.pdf', 'file_path' => 'activity-materials/test.pdf', 'file_type' => 'application/pdf']);
        ActivityResource::create(['activity_id' => $other->id, 'title' => 'O', 'file_name' => 'b.pdf', 'file_path' => 'activity-materials/other.pdf', 'file_type' => 'application/pdf']);

        $this->artisan('activities:remove-test', ['titles' => ['Memory Match']])->assertExitCode(0);

        $this->assertDatabaseMissing('activities', ['id' => $test->id]);
        $this->assertDatabaseMissing('activity_progress', ['activity_id' => $test->id]);
        $this->assertDatabaseMissing('activity_resources', ['activity_id' => $test->id]);
        $disk->assertMissing('activity-materials/test.pdf');

        // Partial title matches and unrelated records are untouched.
        $this->assertDatabaseHas('activities', ['id' => $keep->id]);
        $this->assertDatabaseHas('activities', ['id' => $other->id]);
        $this->assertDatabaseHas('activity_progress', ['activity_id' => $other->id]);
        $disk->assertExists('activity-materials/other.pdf');
        $this->assertDatabaseHas('children', ['id' => $child->id]);
        $this->assertDatabaseHas('users', ['id' => $parent->id]);
    }

    public function test_missing_and_ambiguous_titles_are_reported_and_nothing_is_removed(): void
    {
        $this->activity('Twin');
        $this->activity('Twin');

        $this->artisan('activities:remove-test', ['titles' => ['Twin', 'Does Not Exist']])
            ->expectsOutputToContain('Ambiguous')
            ->expectsOutputToContain('Not found')
            ->assertExitCode(1);

        $this->assertSame(2, Activity::where('title', 'Twin')->count());
    }

    public function test_the_command_still_purges_a_published_test_activity_that_the_admin_api_would_refuse(): void
    {
        $activity = $this->activity('Memory Match');
        $activity->forceFill(['is_published' => true])->save();

        $admin = User::create(['name' => 'A', 'email' => 'a@example.com', 'password' => 'password123']);
        $admin->forceFill(['role' => 'admin'])->save();
        $this->actingAs($admin, 'sanctum')
            ->deleteJson("/api/admin/activities/{$activity->id}")
            ->assertStatus(409);
        $this->assertDatabaseHas('activities', ['id' => $activity->id]);

        $this->artisan('activities:remove-test', ['titles' => ['Memory Match']])->assertExitCode(0);

        $this->assertDatabaseMissing('activities', ['id' => $activity->id]);
    }

    public function test_dry_run_deletes_nothing(): void
    {
        $activity = $this->activity('Memory Match');

        $this->artisan('activities:remove-test', ['titles' => ['Memory Match'], '--dry-run' => true])
            ->expectsOutputToContain('Would remove')
            ->assertExitCode(0);

        $this->assertDatabaseHas('activities', ['id' => $activity->id]);
    }
}
