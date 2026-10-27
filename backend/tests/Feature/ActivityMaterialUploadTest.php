<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityResource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use ZipArchive;

class ActivityMaterialUploadTest extends TestCase
{
    use RefreshDatabase;

    private const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    private const PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

    protected function setUp(): void
    {
        parent::setUp();

        // Isolated, temporary storage: no real files are ever written.
        Storage::fake('local');
    }

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

    private function actingAsAdmin(): User
    {
        $admin = $this->makeUser('admin@example.com', 'admin');
        Sanctum::actingAs($admin);

        return $admin;
    }

    private function makeActivity(bool $published = true): Activity
    {
        $activity = new Activity([
            'title' => 'Button Practice',
            'instructions' => ['Step one'],
            'materials' => ['Board', 'Shirt'],
        ]);
        $activity->is_published = $published;
        $activity->save();

        return $activity;
    }

    private function upload(Activity $activity, array $files)
    {
        return $this->post(
            "/api/admin/activities/{$activity->id}/resources",
            ['files' => $files],
            ['Accept' => 'application/json']
        );
    }

    private function storeResource(Activity $activity, string $name = 'guide.pdf', string $content = 'PDF-CONTENT'): ActivityResource
    {
        $path = "activity-materials/{$activity->id}/".uniqid().'.pdf';
        Storage::disk('local')->put($path, $content);

        return $activity->resources()->create([
            'title' => 'guide',
            'file_name' => $name,
            'file_path' => $path,
            'file_type' => 'application/pdf',
        ]);
    }

    private function makeZipUpload(string $name, array $entries): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'zip');
        $zip = new ZipArchive();
        $zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE);

        foreach ($entries as $entry) {
            $zip->addFromString($entry, '<x/>');
        }

        $zip->close();

        return new UploadedFile($path, $name, 'application/zip', null, true);
    }

    // --- Access control ---

    public function test_guests_and_parents_cannot_upload_remove_or_use_the_admin_download(): void
    {
        $activity = $this->makeActivity();
        $resource = $this->storeResource($activity);
        $file = UploadedFile::fake()->create('a.pdf', 10, 'application/pdf');

        // Guest
        $this->upload($activity, [$file])->assertUnauthorized();
        $this->deleteJson("/api/admin/activities/{$activity->id}/resources/{$resource->id}")->assertUnauthorized();
        $this->getJson("/api/admin/activities/{$activity->id}/resources/{$resource->id}/download")->assertUnauthorized();

        // Parent
        Sanctum::actingAs($this->makeUser('parent@example.com'));
        $this->upload($activity, [$file])->assertForbidden();
        $this->deleteJson("/api/admin/activities/{$activity->id}/resources/{$resource->id}")->assertForbidden();
        $this->getJson("/api/admin/activities/{$activity->id}/resources/{$resource->id}/download")->assertForbidden();

        $this->assertSame(1, ActivityResource::count());
        Storage::disk('local')->assertExists($resource->file_path);
    }

    // --- Uploading ---

    public function test_admin_can_upload_every_supported_type(): void
    {
        $this->actingAsAdmin();
        $activity = $this->makeActivity();

        $files = [
            'pdf' => UploadedFile::fake()->create('guide.pdf', 50, 'application/pdf'),
            'png' => UploadedFile::fake()->create('photo.png', 50, 'image/png'),
            'jpg' => UploadedFile::fake()->create('photo.jpg', 50, 'image/jpeg'),
            'jpeg' => UploadedFile::fake()->create('photo2.jpeg', 50, 'image/jpeg'),
            'txt' => UploadedFile::fake()->create('notes.txt', 5, 'text/plain'),
            'docx' => UploadedFile::fake()->create('lesson.docx', 50, self::DOCX),
            'pptx' => UploadedFile::fake()->create('slides.pptx', 50, self::PPTX),
        ];

        foreach ($files as $label => $file) {
            $this->upload($activity, [$file])
                ->assertCreated()
                ->assertJsonPath('data.resources.0.file_name', $file->getClientOriginalName());
        }

        $this->assertSame(count($files), $activity->resources()->count());
    }

    public function test_upload_response_and_storage_are_safe(): void
    {
        $this->actingAsAdmin();
        $activity = $this->makeActivity();

        $response = $this->upload($activity, [
            UploadedFile::fake()->create('../../evil name.pdf', 10, 'application/pdf'),
        ])->assertCreated();

        $resource = ActivityResource::first();

        // Only display metadata is returned; never the stored path.
        $this->assertEqualsCanonicalizing(
            ['id', 'file_name', 'file_type'],
            array_keys($response->json('data.resources.0'))
        );
        $this->assertStringNotContainsString($resource->file_path, $response->getContent());

        // Display name has no folders; stored name is random and system-chosen.
        $this->assertSame('evil name.pdf', $resource->file_name);
        $this->assertMatchesRegularExpression(
            "#^activity-materials/{$activity->id}/[0-9a-f\-]{36}\.pdf$#",
            $resource->file_path
        );
        Storage::disk('local')->assertExists($resource->file_path);
    }

    public function test_multiple_files_can_be_uploaded_at_once_for_the_right_activity(): void
    {
        $this->actingAsAdmin();
        $activity = $this->makeActivity();
        $other = $this->makeActivity();

        $this->upload($activity, [
            UploadedFile::fake()->create('one.pdf', 10, 'application/pdf'),
            UploadedFile::fake()->create('two.txt', 1, 'text/plain'),
        ])
            ->assertCreated()
            ->assertJsonCount(2, 'data.resources');

        $this->assertSame(2, $activity->resources()->count());
        $this->assertSame(0, $other->resources()->count());
    }

    public function test_real_office_packages_are_accepted_and_fake_ones_rejected(): void
    {
        $this->actingAsAdmin();
        $activity = $this->makeActivity();

        $this->upload($activity, [
            $this->makeZipUpload('real.docx', ['[Content_Types].xml', 'word/document.xml']),
        ])->assertCreated();

        $this->upload($activity, [
            $this->makeZipUpload('real.pptx', ['[Content_Types].xml', 'ppt/presentation.xml']),
        ])->assertCreated();

        // A plain zip renamed to .docx is not an Office document.
        $this->upload($activity, [
            $this->makeZipUpload('sneaky.docx', ['readme.txt']),
        ])->assertStatus(422)->assertJsonValidationErrors('files.0');

        $this->assertSame(2, $activity->resources()->count());
    }

    public function test_unsupported_and_disguised_files_are_rejected(): void
    {
        $this->actingAsAdmin();
        $activity = $this->makeActivity();

        $bad = [
            'exe' => UploadedFile::fake()->create('virus.exe', 10, 'application/x-msdownload'),
            'php' => UploadedFile::fake()->create('shell.php', 1, 'text/x-php'),
            'html' => UploadedFile::fake()->create('page.html', 1, 'text/html'),
            'zip' => UploadedFile::fake()->create('bundle.zip', 10, 'application/zip'),
            'no extension' => UploadedFile::fake()->create('README', 1, 'text/plain'),
            // Right extension, wrong real content type.
            'pdf with html content' => UploadedFile::fake()->create('fake.pdf', 1, 'text/html'),
            'txt with script content' => UploadedFile::fake()->create('code.txt', 1, 'text/x-php'),
            'docx that is not a zip' => UploadedFile::fake()->create('x.docx', 5, 'application/zip'),
            'double extension' => UploadedFile::fake()->create('shell.php.pdf', 1, 'application/x-httpd-php'),
        ];

        foreach ($bad as $label => $file) {
            $this->upload($activity, [$file])
                ->assertStatus(422, "Expected 422 for: {$label}")
                ->assertJsonValidationErrors('files.0');
        }

        $this->assertSame(0, ActivityResource::count());
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_oversized_files_and_bad_requests_are_rejected(): void
    {
        $this->actingAsAdmin();
        $activity = $this->makeActivity();

        // 10 MB limit = 10240 KB
        $this->upload($activity, [UploadedFile::fake()->create('big.pdf', 10241, 'application/pdf')])
            ->assertStatus(422)->assertJsonValidationErrors('files.0');

        $this->upload($activity, [UploadedFile::fake()->create('limit.pdf', 10240, 'application/pdf')])
            ->assertCreated();

        $this->post("/api/admin/activities/{$activity->id}/resources", [], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonValidationErrors('files');

        $this->post("/api/admin/activities/{$activity->id}/resources", ['files' => 'not-files'], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonValidationErrors('files');

        $tooMany = array_map(
            fn ($i) => UploadedFile::fake()->create("f{$i}.txt", 1, 'text/plain'),
            range(1, 11)
        );
        $this->upload($activity, $tooMany)->assertStatus(422)->assertJsonValidationErrors('files');

        $this->assertSame(1, ActivityResource::count());
    }

    public function test_one_bad_file_rejects_the_whole_batch(): void
    {
        $this->actingAsAdmin();
        $activity = $this->makeActivity();

        $this->upload($activity, [
            UploadedFile::fake()->create('good.pdf', 10, 'application/pdf'),
            UploadedFile::fake()->create('bad.exe', 10, 'application/x-msdownload'),
        ])->assertStatus(422)->assertJsonValidationErrors('files.1');

        $this->assertSame(0, ActivityResource::count());
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_uploading_to_a_missing_activity_returns_404(): void
    {
        $this->actingAsAdmin();

        $this->post(
            '/api/admin/activities/9999/resources',
            ['files' => [UploadedFile::fake()->create('a.pdf', 1, 'application/pdf')]],
            ['Accept' => 'application/json']
        )->assertNotFound();
    }

    // --- Coexistence with existing data ---

    public function test_text_materials_and_uploads_coexist_and_updates_keep_uploads(): void
    {
        $this->actingAsAdmin();
        $activity = $this->makeActivity();

        $this->upload($activity, [UploadedFile::fake()->create('guide.pdf', 10, 'application/pdf')])->assertCreated();
        $resource = ActivityResource::first();

        // Updating the activity without new files keeps text materials and uploads.
        $this->putJson("/api/admin/activities/{$activity->id}", [
            'title' => 'Renamed Activity',
            'instructions' => ['New step'],
            'materials' => ['Board', 'Shirt', 'Buttons'],
        ])
            ->assertOk()
            ->assertJsonPath('data.materials', ['Board', 'Shirt', 'Buttons'])
            ->assertJsonPath('data.resources.0.file_name', 'guide.pdf');

        $this->assertSame(1, $activity->resources()->count());
        Storage::disk('local')->assertExists($resource->file_path);

        // Admin detail and list expose the uploads (metadata only).
        $this->getJson("/api/admin/activities/{$activity->id}")
            ->assertOk()->assertJsonPath('data.resources.0.id', $resource->id);
        $this->getJson('/api/admin/activities')
            ->assertOk()->assertJsonPath('data.0.resources.0.id', $resource->id);

        // Publishing and unpublishing do not touch uploads either.
        $this->postJson("/api/admin/activities/{$activity->id}/publish")->assertOk();
        $this->postJson("/api/admin/activities/{$activity->id}/unpublish")->assertOk();
        $this->assertSame(1, $activity->resources()->count());
    }

    // --- Removing ---

    public function test_removing_a_file_deletes_the_record_and_the_stored_file(): void
    {
        $this->actingAsAdmin();
        $activity = $this->makeActivity();
        $keep = $this->storeResource($activity, 'keep.pdf');
        $remove = $this->storeResource($activity, 'remove.pdf');

        $this->deleteJson("/api/admin/activities/{$activity->id}/resources/{$remove->id}")
            ->assertOk()
            ->assertJsonPath('message', 'File removed.');

        $this->assertDatabaseMissing('activity_resources', ['id' => $remove->id]);
        Storage::disk('local')->assertMissing($remove->file_path);

        $this->assertDatabaseHas('activity_resources', ['id' => $keep->id]);
        Storage::disk('local')->assertExists($keep->file_path);
    }

    public function test_a_file_still_used_by_another_record_is_not_deleted(): void
    {
        $this->actingAsAdmin();
        $activity = $this->makeActivity();
        $first = $this->storeResource($activity);
        $second = $activity->resources()->create([
            'title' => 'copy',
            'file_name' => 'copy.pdf',
            'file_path' => $first->file_path,
            'file_type' => 'application/pdf',
        ]);

        $this->deleteJson("/api/admin/activities/{$activity->id}/resources/{$first->id}")->assertOk();

        $this->assertDatabaseMissing('activity_resources', ['id' => $first->id]);
        $this->assertDatabaseHas('activity_resources', ['id' => $second->id]);
        Storage::disk('local')->assertExists($second->file_path);
    }

    public function test_a_file_cannot_be_removed_through_another_activity(): void
    {
        $this->actingAsAdmin();
        $activity = $this->makeActivity();
        $other = $this->makeActivity();
        $resource = $this->storeResource($activity);

        $this->deleteJson("/api/admin/activities/{$other->id}/resources/{$resource->id}")->assertNotFound();
        $this->deleteJson("/api/admin/activities/{$activity->id}/resources/9999")->assertNotFound();

        $this->assertDatabaseHas('activity_resources', ['id' => $resource->id]);
        Storage::disk('local')->assertExists($resource->file_path);
    }

    // --- Downloading ---

    public function test_anyone_can_download_files_of_a_published_activity(): void
    {
        $activity = $this->makeActivity(published: true);
        $resource = $this->storeResource($activity, 'worksheet.pdf', 'HELLO-FILE');

        $response = $this->get("/api/activities/{$activity->id}/resources/{$resource->id}/download")
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('Content-Type', 'application/pdf');

        $this->assertStringContainsString('attachment', $response->headers->get('Content-Disposition'));
        $this->assertStringContainsString('worksheet.pdf', $response->headers->get('Content-Disposition'));
        $this->assertSame('HELLO-FILE', $response->streamedContent());
    }

    public function test_files_of_unpublished_activities_cannot_be_downloaded_by_guessing_urls(): void
    {
        $draft = $this->makeActivity(published: false);
        $resource = $this->storeResource($draft);
        $url = "/api/activities/{$draft->id}/resources/{$resource->id}/download";

        // Guest
        $this->getJson($url)->assertNotFound();

        // Logged-in parent
        Sanctum::actingAs($this->makeUser('parent@example.com'));
        $this->getJson($url)->assertNotFound();

        // The private disk is not reachable through any public path either.
        $this->assertFalse(file_exists(public_path('storage/'.$resource->file_path)));
    }

    public function test_unpublishing_an_activity_stops_public_downloads(): void
    {
        $activity = $this->makeActivity(published: true);
        $resource = $this->storeResource($activity);
        $url = "/api/activities/{$activity->id}/resources/{$resource->id}/download";

        $this->get($url)->assertOk();

        $this->actingAsAdmin();
        $this->postJson("/api/admin/activities/{$activity->id}/unpublish")->assertOk();

        $this->get($url)->assertNotFound();
    }

    public function test_download_urls_cannot_mix_activities_or_use_missing_files(): void
    {
        $activity = $this->makeActivity();
        $other = $this->makeActivity();
        $resource = $this->storeResource($activity);

        // Resource belongs to a different activity.
        $this->getJson("/api/activities/{$other->id}/resources/{$resource->id}/download")->assertNotFound();
        $this->getJson("/api/activities/{$activity->id}/resources/9999/download")->assertNotFound();

        // Database row exists but the file is gone.
        Storage::disk('local')->delete($resource->file_path);
        $this->getJson("/api/activities/{$activity->id}/resources/{$resource->id}/download")->assertNotFound();
    }

    public function test_admins_can_download_files_of_unpublished_activities(): void
    {
        $draft = $this->makeActivity(published: false);
        $resource = $this->storeResource($draft, 'draft.pdf', 'DRAFT-CONTENT');
        $this->actingAsAdmin();

        $response = $this->get("/api/admin/activities/{$draft->id}/resources/{$resource->id}/download")
            ->assertOk();

        $this->assertSame('DRAFT-CONTENT', $response->streamedContent());
    }

    // --- Public activity details ---

    public function test_public_activity_details_list_uploaded_files_without_paths(): void
    {
        $published = $this->makeActivity(published: true);
        $draft = $this->makeActivity(published: false);
        $resource = $this->storeResource($published, 'guide.pdf');
        $this->storeResource($draft, 'secret.pdf');

        $response = $this->getJson("/api/activities/{$published->id}")
            ->assertOk()
            ->assertJsonPath('data.materials', ['Board', 'Shirt'])
            ->assertJsonCount(1, 'data.resources')
            ->assertJsonPath('data.resources.0.id', $resource->id)
            ->assertJsonPath('data.resources.0.file_name', 'guide.pdf');

        $this->assertEqualsCanonicalizing(
            ['id', 'file_name', 'file_type'],
            array_keys($response->json('data.resources.0'))
        );
        $this->assertStringNotContainsString('activity-materials', $response->getContent());

        // A draft stays hidden, including its file list.
        $this->getJson("/api/activities/{$draft->id}")->assertNotFound();
    }

    public function test_activities_without_uploads_return_an_empty_resource_list(): void
    {
        $activity = $this->makeActivity();

        $this->getJson("/api/activities/{$activity->id}")
            ->assertOk()
            ->assertJsonPath('data.resources', []);
    }
}
