<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityResource;
use App\Models\Category;
use App\Models\User;
use App\Support\PdfThumbnail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Card thumbnails: page 1 of a PDF attachment as a JPEG (needs Node and
 * "npm install" in backend/, like production); images use their original file.
 */
class PdfThumbnailTest extends TestCase
{
    use RefreshDatabase;

    private function disk()
    {
        return Storage::disk(config('filesystems.activity_materials.disk'));
    }

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake(config('filesystems.activity_materials.disk'));

        if (! is_dir(base_path('node_modules/pdfjs-dist'))) {
            $this->markTestSkipped('Run "npm install" in backend/ to test thumbnail rendering.');
        }
    }

    /** A valid one-page PDF (a heading and a box) built with correct offsets. */
    private function pdfBytes(): string
    {
        $content = "BT /F1 36 Tf 60 700 Td (Worksheet) Tj ET\n0.2 0.6 0.9 rg 60 400 300 200 re f\n";
        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
            '<< /Length '.strlen($content)." >>\nstream\n{$content}endstream",
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        ];
        $pdf = "%PDF-1.4\n";
        $offsets = [];

        foreach ($objects as $i => $object) {
            $offsets[$i + 1] = strlen($pdf);
            $pdf .= ($i + 1)." 0 obj\n{$object}\nendobj\n";
        }

        $xref = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objects) + 1)."\n0000000000 65535 f \n";
        foreach ($offsets as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }

        return $pdf.'trailer << /Size '.(count($objects) + 1)." /Root 1 0 R >>\nstartxref\n{$xref}\n%%EOF\n";
    }

    private function pngBytes(): string
    {
        return base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
    }

    private function admin(): User
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'admin@example.com', 'password' => 'password-123']);
        $admin->forceFill(['role' => 'admin', 'email_verified_at' => now()])->save();

        return $admin;
    }

    private function activity(bool $published = true): Activity
    {
        return Activity::create([
            'category_id' => Category::firstOrCreate(['name' => 'Handwriting'])->id,
            'title' => 'Sheet', 'instructions' => ['x'], 'materials' => [], 'difficulty' => 'Easy',
            'created_by' => User::value('id') ?? $this->admin()->id, 'is_published' => $published,
        ]);
    }

    private function pdfResource(Activity $activity, ?string $bytes = null): ActivityResource
    {
        $path = "activity-materials/{$activity->id}/".uniqid().'.pdf';
        $this->disk()->put($path, $bytes ?? $this->pdfBytes());

        return $activity->resources()->create([
            'title' => 'Sheet', 'file_name' => 'Sheet.pdf', 'file_path' => $path, 'file_type' => 'application/pdf',
        ]);
    }

    private function imageResource(Activity $activity): ActivityResource
    {
        $path = "activity-materials/{$activity->id}/".uniqid().'.png';
        $this->disk()->put($path, $this->pngBytes());

        return $activity->resources()->create([
            'title' => 'Pic', 'file_name' => 'Pic.png', 'file_path' => $path, 'file_type' => 'image/png',
        ]);
    }

    // ---------------------------------------------------------------- generation

    public function test_it_renders_page_one_as_a_jpeg_at_a_predictable_path_and_leaves_the_original_alone(): void
    {
        $activity = $this->activity();
        $resource = $this->pdfResource($activity);
        $originalHash = hash('sha256', $this->disk()->get($resource->file_path));

        $this->assertSame('created', PdfThumbnail::generate($resource));

        $path = "activity-thumbnails/{$activity->id}/{$resource->id}.jpg";
        $this->assertSame($path, PdfThumbnail::path($resource));
        $this->assertTrue($this->disk()->exists($path));
        $this->assertStringStartsWith("\xFF\xD8", $this->disk()->get($path));
        $this->assertSame(600, getimagesizefromstring($this->disk()->get($path))[0]);
        $this->assertSame($originalHash, hash('sha256', $this->disk()->get($resource->file_path)));
    }

    public function test_an_existing_thumbnail_is_not_regenerated_unless_forced(): void
    {
        $resource = $this->pdfResource($this->activity());
        $path = PdfThumbnail::path($resource);
        $this->disk()->put($path, 'marker');

        $this->assertSame('exists', PdfThumbnail::generate($resource));
        $this->assertSame('marker', $this->disk()->get($path));

        $this->assertSame('created', PdfThumbnail::generate($resource, force: true));
        $this->assertStringStartsWith("\xFF\xD8", $this->disk()->get($path));
    }

    public function test_bad_missing_and_non_pdf_files_fail_safely_without_throwing(): void
    {
        $broken = $this->pdfResource($this->activity(), "%PDF-1.4\nthis is not really a pdf");
        $this->assertSame('failed', PdfThumbnail::generate($broken));
        $this->assertFalse($this->disk()->exists(PdfThumbnail::path($broken)));

        $missing = $this->pdfResource($this->activity());
        $this->disk()->delete($missing->file_path);
        $this->assertSame('missing_source', PdfThumbnail::generate($missing));

        $this->assertSame('not_pdf', PdfThumbnail::generate($this->imageResource($this->activity())));
    }

    public function test_a_missing_renderer_means_no_thumbnail_not_an_error(): void
    {
        config(['filesystems.activity_materials.thumbnail.node' => 'definitely-not-a-real-node-binary']);
        $resource = $this->pdfResource($this->activity());

        $this->assertSame('failed', PdfThumbnail::generate($resource));
        $this->assertFalse(PdfThumbnail::exists($resource));
    }

    // ---------------------------------------------------------------- uploads and deletion

    public function test_a_new_pdf_upload_gets_its_thumbnail_automatically_and_stays_downloadable(): void
    {
        Sanctum::actingAs($this->admin());
        $activity = $this->activity();
        $bytes = $this->pdfBytes();

        $response = $this->post("/api/admin/activities/{$activity->id}/resources", [
            'files' => [UploadedFile::fake()->createWithContent('Worksheet.pdf', $bytes)],
        ], ['Accept' => 'application/json'])->assertCreated();

        $resource = ActivityResource::findOrFail($response->json('data.resources.0.id'));
        $this->assertTrue(PdfThumbnail::exists($resource));
        $this->assertSame($bytes, $this->disk()->get($resource->file_path));
        $this->get("/api/activities/{$activity->id}/resources/{$resource->id}/download")
            ->assertOk()->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_an_upload_still_succeeds_when_the_thumbnail_cannot_be_made(): void
    {
        config(['filesystems.activity_materials.thumbnail.node' => 'definitely-not-a-real-node-binary']);
        Sanctum::actingAs($this->admin());
        $activity = $this->activity();

        $this->post("/api/admin/activities/{$activity->id}/resources", [
            'files' => [UploadedFile::fake()->createWithContent('Worksheet.pdf', $this->pdfBytes())],
        ], ['Accept' => 'application/json'])->assertCreated();

        $this->assertSame(1, $activity->resources()->count());
        $this->assertSame([], $this->disk()->allFiles('activity-thumbnails'));
    }

    public function test_an_image_upload_does_not_get_a_second_image(): void
    {
        Sanctum::actingAs($this->admin());
        $activity = $this->activity();

        $this->post("/api/admin/activities/{$activity->id}/resources", [
            'files' => [UploadedFile::fake()->createWithContent('Pic.png', $this->pngBytes())],
        ], ['Accept' => 'application/json'])->assertCreated();

        $this->assertSame([], $this->disk()->allFiles('activity-thumbnails'));
    }

    public function test_removing_an_attachment_or_purging_the_activity_removes_its_thumbnail(): void
    {
        Sanctum::actingAs($this->admin());
        $activity = $this->activity();
        $one = $this->pdfResource($activity);
        $two = $this->pdfResource($activity);
        PdfThumbnail::generate($one);
        PdfThumbnail::generate($two);

        $this->deleteJson("/api/admin/activities/{$activity->id}/resources/{$one->id}")->assertOk();
        $this->assertFalse($this->disk()->exists(PdfThumbnail::path($one)));
        $this->assertTrue($this->disk()->exists(PdfThumbnail::path($two)));

        $activity->refresh()->purge();
        $this->assertSame([], $this->disk()->allFiles('activity-thumbnails'));
    }

    // ---------------------------------------------------------------- public access

    public function test_the_thumbnail_route_serves_only_the_jpeg_of_a_published_activitys_pdf(): void
    {
        $activity = $this->activity();
        $resource = $this->pdfResource($activity);
        PdfThumbnail::generate($resource);

        $this->get("/api/activities/{$activity->id}/resources/{$resource->id}/thumbnail")
            ->assertOk()
            ->assertHeader('Content-Type', 'image/jpeg')
            ->assertHeader('X-Content-Type-Options', 'nosniff');

        // A draft and an archived activity answer 404.
        $activity->forceFill(['is_published' => false])->save();
        $this->get("/api/activities/{$activity->id}/resources/{$resource->id}/thumbnail")->assertNotFound();

        $activity->forceFill(['is_published' => true, 'archived_at' => now()])->save();
        $this->get("/api/activities/{$activity->id}/resources/{$resource->id}/thumbnail")->assertNotFound();
    }

    public function test_the_thumbnail_route_cannot_be_used_to_reach_other_files(): void
    {
        $activity = $this->activity();
        $pdf = $this->pdfResource($activity);
        PdfThumbnail::generate($pdf);
        $image = $this->imageResource($activity);
        $other = $this->activity();

        // An attachment under the wrong activity, an image attachment, a PDF without a thumbnail,
        // non-numeric and unknown ids: all 404 and never the original file.
        $this->get("/api/activities/{$other->id}/resources/{$pdf->id}/thumbnail")->assertNotFound();
        $this->get("/api/activities/{$activity->id}/resources/{$image->id}/thumbnail")->assertNotFound();
        $this->get("/api/activities/{$activity->id}/resources/{$this->pdfResource($activity)->id}/thumbnail")->assertNotFound();
        $this->get('/api/activities/abc/resources/def/thumbnail')->assertNotFound();
        $this->get('/api/activities/99999/resources/99999/thumbnail')->assertNotFound();
    }

    public function test_the_activity_list_and_details_point_each_card_at_the_right_picture(): void
    {
        $withPdf = $this->activity();
        $pdf = $this->pdfResource($withPdf);
        PdfThumbnail::generate($pdf);

        $withImage = $this->activity();
        $image = $this->imageResource($withImage);

        $pdfNoThumb = $this->activity();
        $this->pdfResource($pdfNoThumb);

        $none = $this->activity();

        $list = collect($this->getJson('/api/activities')->assertOk()->json('data'))->keyBy('id');

        $this->assertStringEndsWith("/api/activities/{$withPdf->id}/resources/{$pdf->id}/thumbnail", $list[$withPdf->id]['thumbnail_url']);
        $this->assertStringEndsWith("/api/activities/{$withImage->id}/resources/{$image->id}/download", $list[$withImage->id]['thumbnail_url']);
        $this->assertNull($list[$pdfNoThumb->id]['thumbnail_url']);
        $this->assertNull($list[$none->id]['thumbnail_url']);

        // The details page agrees, and still lists the original attachment.
        $this->getJson("/api/activities/{$withPdf->id}")
            ->assertOk()
            ->assertJsonPath('data.thumbnail_url', $list[$withPdf->id]['thumbnail_url'])
            ->assertJsonPath('data.resources.0.file_type', 'application/pdf');

        // No filesystem path is exposed anywhere in the payload.
        $this->assertStringNotContainsString('activity-thumbnails', json_encode($list));
        $this->assertStringNotContainsString('activity-materials', json_encode($list));
    }

    // ---------------------------------------------------------------- command

    public function test_the_command_fills_in_missing_thumbnails_skips_images_and_is_repeatable(): void
    {
        $activity = $this->activity();
        $a = $this->pdfResource($activity);
        $b = $this->pdfResource($activity);
        $this->imageResource($activity);

        $this->artisan('activities:generate-thumbnails')->assertSuccessful();

        $this->assertTrue(PdfThumbnail::exists($a));
        $this->assertTrue(PdfThumbnail::exists($b));
        $this->assertCount(2, $this->disk()->allFiles('activity-thumbnails'));

        $this->disk()->put(PdfThumbnail::path($a), 'marker');
        $this->artisan('activities:generate-thumbnails')->assertSuccessful();
        $this->assertSame('marker', $this->disk()->get(PdfThumbnail::path($a)));
    }

    public function test_the_command_reports_a_failure_with_a_failing_exit_code(): void
    {
        $this->pdfResource($this->activity(), "%PDF-1.4\nbroken");

        $this->artisan('activities:generate-thumbnails')->assertFailed();
    }
}
