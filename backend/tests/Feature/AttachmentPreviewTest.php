<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityResource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;
use ZipArchive;

/**
 * Supported attachment types, validation by real content, safe serving and the
 * attached-image card fallback. Uses a fake disk and isolated records.
 */
class AttachmentPreviewTest extends TestCase
{
    use RefreshDatabase;

    private const JSON = ['Accept' => 'application/json'];

    // Smallest real files of each format (content is what the server detects).
    private const GIF = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    private const WEBP = 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==';
    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    private function user(string $role): User
    {
        $user = User::firstOrCreate(['email' => $role.'@example.com'], ['name' => ucfirst($role), 'password' => 'password123']);
        $user->forceFill(['role' => $role])->save();

        return $user;
    }

    private function activity(bool $published = true): Activity
    {
        $activity = Activity::create(['title' => 'Card', 'instructions' => ['Go'], 'materials' => [], 'difficulty' => 'Easy']);
        $activity->forceFill(['is_published' => $published])->save();

        return $activity;
    }

    private function zip(string $marker): string
    {
        $path = tempnam(sys_get_temp_dir(), 'ooxml');
        $zip = new ZipArchive();
        $zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        $zip->addFromString('[Content_Types].xml', '<Types/>');
        $zip->addFromString($marker, '<x/>');
        $zip->close();
        $bytes = file_get_contents($path);
        unlink($path);

        return $bytes;
    }

    private function file(string $name, string $content): UploadedFile
    {
        // A real temp file: the server then detects the type from the CONTENT
        // (the fake() helpers would report a type guessed from the file name).
        $path = tempnam(sys_get_temp_dir(), 'att');
        file_put_contents($path, $content);

        return new UploadedFile($path, $name, null, null, true);
    }

    private function upload(Activity $activity, array $files)
    {
        return $this->post("/api/admin/activities/{$activity->id}/resources", ['files' => $files], self::JSON);
    }

    public static function supported(): array
    {
        return [
            'png' => ['pic.png', 'image/png'],
            'jpg' => ['pic.jpg', 'image/jpeg'],
            'jpeg' => ['pic.jpeg', 'image/jpeg'],
            'webp' => ['pic.webp', 'image/webp'],
            'gif' => ['pic.gif', 'image/gif'],
            'pdf' => ['doc.pdf', 'application/pdf'],
            'txt' => ['notes.txt', 'text/plain'],
            'docx' => ['doc.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            'xlsx' => ['sheet.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            'pptx' => ['deck.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
        ];
    }

    private function jpeg(): string
    {
        ob_start();
        imagejpeg(imagecreatetruecolor(4, 4));

        return ob_get_clean();
    }

    private function contentFor(string $name): string
    {
        return match (pathinfo($name, PATHINFO_EXTENSION)) {
            'png' => base64_decode(self::PNG),
            'jpg', 'jpeg' => $this->jpeg(),
            'webp' => base64_decode(self::WEBP),
            'gif' => base64_decode(self::GIF),
            'pdf' => "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF",
            'txt' => "Plain notes\nsecond line",
            'docx' => $this->zip('word/document.xml'),
            'xlsx' => $this->zip('xl/workbook.xml'),
            'pptx' => $this->zip('ppt/presentation.xml'),
        };
    }

    #[DataProvider('supported')]
    public function test_every_supported_format_uploads_is_stored_with_its_type_and_downloads_safely(string $name, string $type): void
    {
        $activity = $this->activity();
        Sanctum::actingAs($this->user('admin'));

        $this->upload($activity, [$this->file($name, $this->contentFor($name))])
            ->assertCreated()
            ->assertJsonPath('data.resources.0.file_type', $type)
            ->assertJsonMissingPath('data.resources.0.file_path');

        $resource = $activity->resources()->firstOrFail();

        // The public route serves a published activity's file as an attachment
        // with the stored type, never sniffed or rendered by the server.
        $this->app['auth']->forgetGuards();
        $response = $this->get("/api/activities/{$activity->id}/resources/{$resource->id}/download");
        $response->assertOk();
        $this->assertSame($type, explode(';', $response->headers->get('Content-Type'))[0]);
        $this->assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));
        $this->assertStringContainsString('attachment', $response->headers->get('Content-Disposition'));
        $this->assertStringContainsString('sandbox', $response->headers->get('Content-Security-Policy'));
    }

    public static function unsupported(): array
    {
        return [
            'svg' => ['logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
            'html' => ['page.html', '<html><script>alert(1)</script></html>'],
            'html renamed txt' => ['page.txt', '<!DOCTYPE html><html><body><script>alert(1)</script></body></html>'],
            'php' => ['shell.php', '<?php echo 1;'],
            'exe' => ['run.exe', "MZ\x90\x00\x03\x00\x00\x00"],
            'js' => ['run.js', 'alert(1)'],
            'png extension with text inside' => ['fake.png', 'just text, not a png'],
            'gif content named jpg' => ['mismatch.jpg', null],
            'pdf extension with html inside' => ['fake.pdf', '<html>nope</html>'],
            'docx that is not a package' => ['fake.docx', 'not a zip'],
            'xlsx that is really a docx' => ['wrong.xlsx', null],
            'double extension' => ['evil.png.php', '<?php echo 1;'],
        ];
    }

    #[DataProvider('unsupported')]
    public function test_unsupported_or_mismatching_files_are_rejected_and_nothing_is_stored(string $name, ?string $content): void
    {
        $content ??= $name === 'mismatch.jpg' ? base64_decode(self::GIF) : $this->zip('word/document.xml');
        $activity = $this->activity();
        Sanctum::actingAs($this->user('admin'));

        $this->upload($activity, [$this->file($name, $content)])
            ->assertStatus(422)
            ->assertJsonValidationErrors('files.0');

        $this->assertSame(0, $activity->resources()->count());
        $this->assertSame([], Storage::disk('local')->allFiles('activity-materials'));
    }

    public function test_the_size_limit_still_applies(): void
    {
        $activity = $this->activity();
        Sanctum::actingAs($this->user('admin'));

        $this->upload($activity, [UploadedFile::fake()->create('big.pdf', 10241, 'application/pdf')])
            ->assertStatus(422)->assertJsonValidationErrors('files.0');
        $this->upload($activity, [UploadedFile::fake()->create('ok.pdf', 10240, 'application/pdf')])
            ->assertCreated();
    }

    public function test_only_admins_can_upload_and_drafts_and_archived_files_are_not_public(): void
    {
        $draft = $this->activity(published: false);
        $live = $this->activity();
        $this->upload($live, [$this->file('a.txt', 'hello world notes')])->assertUnauthorized();

        Sanctum::actingAs($this->user('parent'));
        $this->upload($live, [$this->file('a.txt', 'hello world notes')])->assertForbidden();

        Sanctum::actingAs($this->user('admin'));
        $this->upload($draft, [$this->file('a.txt', 'hello world notes')])->assertCreated();
        $this->upload($live, [$this->file('a.txt', 'hello world notes')])->assertCreated();
        $draftFile = $draft->resources()->first();
        $liveFile = $live->resources()->first();

        $this->app['auth']->forgetGuards();
        $this->get("/api/activities/{$draft->id}/resources/{$draftFile->id}/download")->assertNotFound();
        $this->get("/api/activities/{$live->id}/resources/{$liveFile->id}/download")->assertOk();

        // A file id under the wrong activity is not reachable either.
        $this->get("/api/activities/{$live->id}/resources/{$draftFile->id}/download")->assertNotFound();

        // Archiving closes the known URL again, and restoring reopens it.
        $live->forceFill(['archived_at' => now(), 'archived_was_published' => true, 'is_published' => false])->save();
        $this->get("/api/activities/{$live->id}/resources/{$liveFile->id}/download")->assertNotFound();
        $this->assertSame(1, $live->resources()->count());
        $live->forceFill(['archived_at' => null, 'archived_was_published' => null, 'is_published' => true])->save();
        $this->get("/api/activities/{$live->id}/resources/{$liveFile->id}/download")->assertOk();
    }

    /**
     * The viewer reads the file with fetch() from the download route and shows it
     * from a blob, so what matters is the exact status, type and BYTES the route
     * returns for each previewable format. (fetch ignores Content-Disposition, which
     * only affects direct navigation; the route keeps it as `attachment`.)
     */
    public static function previewable(): array
    {
        return [
            'png' => ['pic.png', 'image/png'],
            'jpg' => ['pic.jpg', 'image/jpeg'],
            'webp' => ['pic.webp', 'image/webp'],
            'gif' => ['pic.gif', 'image/gif'],
            'pdf' => ['doc.pdf', 'application/pdf'],
            'txt' => ['notes.txt', 'text/plain'],
        ];
    }

    #[DataProvider('previewable')]
    public function test_the_route_the_viewer_reads_returns_the_exact_bytes_with_the_right_type(string $name, string $type): void
    {
        $activity = $this->activity();
        $bytes = $this->contentFor($name);
        Sanctum::actingAs($this->user('admin'));
        $this->upload($activity, [$this->file($name, $bytes)])->assertCreated();
        $resource = $activity->resources()->firstOrFail();

        $this->app['auth']->forgetGuards();
        $response = $this->get("/api/activities/{$activity->id}/resources/{$resource->id}/download");

        $response->assertOk();
        $this->assertSame($bytes, $response->streamedContent());
        $this->assertSame($type, explode(';', $response->headers->get('Content-Type'))[0]);
        $this->assertStringNotContainsString('html', $response->headers->get('Content-Type'));
        $this->assertStringStartsWith('attachment', $response->headers->get('Content-Disposition'));
        $this->assertStringContainsString('private', $response->headers->get('Cache-Control'));
    }

    public function test_office_documents_are_served_as_attachments_with_their_own_type_and_are_not_previewable_types(): void
    {
        $activity = $this->activity();
        Sanctum::actingAs($this->user('admin'));

        foreach (['doc.docx', 'sheet.xlsx', 'deck.pptx'] as $name) {
            $this->upload($activity, [$this->file($name, $this->contentFor($name))])->assertCreated();
        }

        $this->app['auth']->forgetGuards();
        foreach ($activity->resources()->get() as $resource) {
            $response = $this->get("/api/activities/{$activity->id}/resources/{$resource->id}/download");
            $response->assertOk();
            $this->assertStringStartsWith('attachment', $response->headers->get('Content-Disposition'));
            $this->assertNotContains($resource->file_type, ActivityResource::IMAGE_TYPES);
            $this->assertNotContains($resource->file_type, ['application/pdf', 'text/plain']);
        }
    }

    public function test_an_odd_stored_type_is_served_as_opaque_bytes(): void
    {
        $activity = $this->activity();
        Storage::disk('local')->put('activity-materials/1/odd.bin', '<svg onload=alert(1)>');
        $resource = ActivityResource::create(['activity_id' => $activity->id, 'title' => 'x', 'file_name' => 'x.svg', 'file_path' => 'activity-materials/1/odd.bin', 'file_type' => 'image/svg+xml']);

        $response = $this->get("/api/activities/{$activity->id}/resources/{$resource->id}/download");
        $this->assertSame('application/octet-stream', explode(';', $response->headers->get('Content-Type'))[0]);
    }

    // ---- card picture priority: dedicated -> attached image -> placeholder (null) ----

    private function attach(Activity $activity, string $name, string $type): ActivityResource
    {
        Storage::disk('local')->put("activity-materials/{$activity->id}/{$name}", 'x');

        return ActivityResource::create(['activity_id' => $activity->id, 'title' => $name, 'file_name' => $name, 'file_path' => "activity-materials/{$activity->id}/{$name}", 'file_type' => $type]);
    }

    public function test_a_dedicated_picture_and_an_attached_image_are_both_offered_in_priority_order_for_the_client(): void
    {
        $activity = $this->activity();
        $this->attach($activity, 'a.png', 'image/png');
        Storage::disk('local')->put('activity-images/p.png', 'x');
        $activity->forceFill(['image_path' => 'activity-images/p.png'])->save();
        $resource = $activity->resources()->first();

        $row = $this->getJson('/api/activities')->assertOk()->json('data.0');

        $this->assertNotNull($row['image_url']);
        $this->assertStringContainsString("/api/activities/{$activity->id}/image", $row['image_url']);
        $this->assertStringEndsWith("/api/activities/{$activity->id}/resources/{$resource->id}/download", $row['attachment_image_url']);

        $this->getJson("/api/activities/{$activity->id}")
            ->assertJsonPath('data.attachment_image_url', $row['attachment_image_url']);
    }

    public function test_an_attached_image_is_used_when_there_is_no_dedicated_picture(): void
    {
        $activity = $this->activity();
        $this->attach($activity, 'b.pdf', 'application/pdf');
        $second = $this->attach($activity, 'c.webp', 'image/webp');
        $this->attach($activity, 'd.gif', 'image/gif');

        $row = $this->getJson('/api/activities')->json('data.0');

        $this->assertNull($row['image_url']);
        // The first supported IMAGE attachment; the PDF before it is skipped.
        $this->assertStringEndsWith("/resources/{$second->id}/download", $row['attachment_image_url']);
    }

    public function test_pdfs_and_documents_never_become_a_card_picture_so_the_placeholder_stays(): void
    {
        $activity = $this->activity();
        $this->attach($activity, 'a.pdf', 'application/pdf');
        $this->attach($activity, 'b.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        $this->attach($activity, 'c.txt', 'text/plain');
        $this->attach($activity, 'd.svg', 'image/svg+xml');

        $row = $this->getJson('/api/activities')->json('data.0');
        $this->assertNull($row['image_url']);
        $this->assertNull($row['attachment_image_url']);
    }

    public function test_the_fallback_follows_attachment_changes_and_never_touches_the_dedicated_picture(): void
    {
        $activity = $this->activity();
        Storage::disk('local')->put('activity-images/p.png', 'x');
        $activity->forceFill(['image_path' => 'activity-images/p.png'])->save();
        $resource = $this->attach($activity, 'a.png', 'image/png');

        $this->assertNotNull($this->getJson('/api/activities')->json('data.0.attachment_image_url'));

        Sanctum::actingAs($this->user('admin'));
        $this->deleteJson("/api/admin/activities/{$activity->id}/resources/{$resource->id}")->assertOk();

        $row = $this->getJson('/api/activities')->json('data.0');
        $this->assertNull($row['attachment_image_url']);
        $this->assertNotNull($row['image_url']);
        Storage::disk('local')->assertExists('activity-images/p.png');
    }

    public function test_a_missing_attachment_file_answers_404_so_the_card_can_fall_back(): void
    {
        $activity = $this->activity();
        $resource = $this->attach($activity, 'gone.png', 'image/png');
        Storage::disk('local')->delete($resource->file_path);

        $this->get("/api/activities/{$activity->id}/resources/{$resource->id}/download")->assertNotFound();
    }
}
