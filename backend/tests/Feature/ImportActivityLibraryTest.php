<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityResource;
use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ImportActivityLibraryTest extends TestCase
{
    use RefreshDatabase;

    private string $source;

    private string $data;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake(config('filesystems.activity_materials.disk'));

        foreach (Category::REQUIRED_NAMES as $name) {
            Category::firstOrCreate(['name' => $name]);
        }

        $admin = User::create(['name' => 'Admin', 'email' => 'admin@example.com', 'password' => 'password-123']);
        $admin->forceFill(['role' => 'admin', 'email_verified_at' => now()])->save();

        $this->source = sys_get_temp_dir().'/theraplay-import-'.uniqid();
        File::ensureDirectoryExists($this->source.'/Sensory');
        File::ensureDirectoryExists($this->source.'/Handwriting');
        File::ensureDirectoryExists($this->source.'/Visual');

        file_put_contents($this->source.'/Handwriting/Trace.pdf', "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
        file_put_contents($this->source.'/Sensory/Card.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='));
        file_put_contents($this->source.'/Visual/Scan.jpg', base64_decode('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+AB//Z'));

        $this->data = $this->source.'/library.json';
        $this->writeData($this->entries());
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->source);
        parent::tearDown();
    }

    private function entries(): array
    {
        return [
            ['category' => 'Handwriting', 'title' => 'Trace Lines', 'file' => 'Trace.pdf', 'difficulty' => 'Easy',
                'description' => 'A worksheet for tracing lines.', 'instructions' => ['Trace the lines.'], 'materials' => ['Pencil']],
            ['category' => 'Sensory', 'title' => 'Card Activity', 'file' => 'Card.png', 'difficulty' => 'Medium',
                'description' => 'An activity card with steps.', 'objective' => 'The card lists: balance.', 'instructions' => ['Step one.', 'Step two.'], 'materials' => []],
            ['category' => 'Visual', 'title' => 'Scan Sheet', 'file' => 'Scan.jpg', 'difficulty' => 'Hard',
                'description' => 'A visual scanning worksheet.', 'instructions' => ['Find the letter.'], 'materials' => ['Printed worksheet']],
        ];
    }

    private function writeData(array $entries): void
    {
        file_put_contents($this->data, json_encode(['activities' => $entries]));
    }

    private function run_(array $extra = [])
    {
        return $this->artisan('activities:import-library', ['source' => $this->source, '--data' => $this->data] + $extra);
    }

    public function test_it_imports_into_the_existing_categories_as_unpublished_drafts_with_the_original_file(): void
    {
        $categoryCount = Category::count();

        $this->run_()->assertSuccessful();

        $this->assertSame(3, Activity::count());
        $this->assertSame($categoryCount, Category::count());
        $this->assertSame(0, Activity::where('is_published', true)->count());
        $this->assertSame(['Easy', 'Hard', 'Medium'], Activity::orderBy('difficulty')->pluck('difficulty')->all());

        $activity = Activity::where('title', 'Card Activity')->firstOrFail();
        $this->assertSame('Sensory', $activity->category->name);
        $this->assertSame(['Step one.', 'Step two.'], $activity->instructions);
        $this->assertSame('The card lists: balance.', $activity->objective);
        $this->assertSame(User::where('email', 'admin@example.com')->value('id'), $activity->created_by);

        $resource = $activity->resources()->firstOrFail();
        $this->assertSame('Card.png', $resource->file_name);
        $this->assertSame('image/png', $resource->file_type);
        $this->assertStringStartsWith("activity-materials/{$activity->id}/", $resource->file_path);
        $this->assertSame(
            hash_file('sha256', $this->source.'/Sensory/Card.png'),
            hash('sha256', Storage::disk(config('filesystems.activity_materials.disk'))->get($resource->file_path))
        );
    }

    public function test_running_it_again_creates_no_duplicate_activities_or_attachments(): void
    {
        $this->run_()->assertSuccessful();
        $this->run_()->assertSuccessful();

        $this->assertSame(3, Activity::count());
        $this->assertSame(3, ActivityResource::count());
        $this->assertCount(3, Storage::disk(config('filesystems.activity_materials.disk'))->allFiles('activity-materials'));
    }

    public function test_a_dry_run_changes_nothing(): void
    {
        $this->run_(['--dry-run' => true])->assertSuccessful();

        $this->assertSame(0, Activity::count());
        $this->assertSame([], Storage::disk(config('filesystems.activity_materials.disk'))->allFiles('activity-materials'));
    }

    public function test_it_never_creates_a_category(): void
    {
        Category::where('name', 'Visual')->delete();

        $this->run_()->assertFailed();

        $this->assertSame(0, Activity::count());
        $this->assertSame(0, Category::where('name', 'Visual')->count());
    }

    public function test_a_file_whose_content_is_not_what_its_name_says_stops_everything(): void
    {
        file_put_contents($this->source.'/Handwriting/Trace.pdf', '<html><script>alert(1)</script></html>');

        $this->run_()->assertFailed();

        $this->assertSame(0, Activity::count());
    }

    public function test_a_missing_file_stops_everything(): void
    {
        unlink($this->source.'/Visual/Scan.jpg');

        $this->run_()->assertFailed();

        $this->assertSame(0, Activity::count());
    }

    public function test_only_easy_medium_and_hard_are_accepted_by_the_import(): void
    {
        $entries = $this->entries();
        $entries[0]['difficulty'] = 'Beginner';
        $this->writeData($entries);

        $this->run_()->assertFailed();

        $this->assertSame(0, Activity::count());
    }

    public function test_every_activity_needs_at_least_one_instruction(): void
    {
        $entries = $this->entries();
        $entries[1]['instructions'] = [];
        $this->writeData($entries);

        $this->run_()->assertFailed();

        $this->assertSame(0, Activity::count());
    }

    public function test_an_existing_activity_is_not_duplicated_and_only_a_missing_attachment_is_added(): void
    {
        $existing = Activity::create([
            'category_id' => Category::where('name', 'Handwriting')->value('id'),
            'title' => 'trace lines', 'description' => 'Hand-made', 'instructions' => ['Mine.'], 'materials' => [],
            'difficulty' => 'Medium', 'created_by' => User::value('id'),
        ]);

        $this->run_()->assertSuccessful();

        $this->assertSame(3, Activity::count());
        $existing->refresh();
        $this->assertSame('Hand-made', $existing->description);
        $this->assertSame('Medium', $existing->difficulty);
        $this->assertSame(1, $existing->resources()->count());
    }

    public function test_the_shipped_library_metadata_follows_the_selection_rules(): void
    {
        $library = json_decode(file_get_contents(database_path('data/activity-library.json')), true)['activities'];

        $this->assertCount(73, $library);

        $perCategory = [];
        $seen = [];

        foreach ($library as $entry) {
            $this->assertContains($entry['category'], Category::REQUIRED_NAMES);
            $this->assertContains($entry['difficulty'], ['Easy', 'Medium', 'Hard']);
            $this->assertNotEmpty($entry['instructions'], $entry['title']);
            $this->assertNotSame('', trim($entry['description']), $entry['title']);
            $this->assertNotContains($entry['category'].'/'.mb_strtolower($entry['title']), $seen);
            $seen[] = $entry['category'].'/'.mb_strtolower($entry['title']);
            $perCategory[$entry['category']] = ($perCategory[$entry['category']] ?? 0) + 1;
        }

        $this->assertSame([
            'Executive Function' => 15, 'Fine Motor Skills' => 15, 'Functioning Skills' => 8,
            'Handwriting' => 10, 'Sensory' => 15, 'Visual' => 10,
        ], $perCategory);

        // Beginner -> Easy and Intermediate -> Medium, as approved.
        foreach ($library as $entry) {
            if (str_ends_with($entry['title'], ' Beginner')) {
                $this->assertSame('Easy', $entry['difficulty'], $entry['title']);
            }
            if (str_ends_with($entry['title'], ' Intermediate')) {
                $this->assertSame('Medium', $entry['difficulty'], $entry['title']);
            }
        }
    }

    public function test_difficulty_is_limited_to_easy_medium_and_hard_in_the_admin_api(): void
    {
        $admin = User::where('email', 'admin@example.com')->firstOrFail();
        Sanctum::actingAs($admin);
        $category = Category::where('name', 'Sensory')->value('id');
        $payload = ['category_id' => $category, 'title' => 'T', 'instructions' => ['x'], 'materials' => []];

        foreach (['Beginner', 'Intermediate', 'Advanced', 'easy', ''] as $bad) {
            $this->postJson('/api/admin/activities', $payload + ['difficulty' => $bad])
                ->assertStatus(422)->assertJsonValidationErrors('difficulty');
        }

        foreach (['Easy', 'Medium', 'Hard'] as $i => $good) {
            $this->postJson('/api/admin/activities', ['title' => "T{$i}"] + $payload + ['difficulty' => $good])->assertCreated();
        }
    }
}
