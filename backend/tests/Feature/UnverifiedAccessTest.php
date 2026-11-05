<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityProgress;
use App\Models\Category;
use App\Models\Child;
use App\Models\User;
use App\Notifications\VerificationCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * An unverified parent can log in and browse, but cannot do anything transactional
 * (enforced on the server); the email may be corrected only while unverified.
 */
class UnverifiedAccessTest extends TestCase
{
    use RefreshDatabase;

    private function parent(string $email = 'p@example.com', bool $verified = false): User
    {
        $user = User::create(['name' => 'Pat Parent', 'email' => $email, 'password' => 'password123']);
        $user->forceFill(['role' => 'parent', 'email_verified_at' => $verified ? now() : null])->save();

        return $user;
    }

    private function act(User $user): void
    {
        $this->app['auth']->forgetGuards();
        Sanctum::actingAs($user);
    }

    private function activity(): Activity
    {
        return Activity::create([
            'category_id' => Category::firstOrCreate(['name' => 'Fine Motor Skills'])->id,
            'title' => 'Buttons',
            'objective' => 'Practice.',
            'instructions' => ['One'],
            'materials' => ['Board'],
            'is_published' => true,
        ]);
    }

    // ---------------------------------------------------------------- browsing is allowed

    public function test_an_unverified_parent_can_log_in_and_browse(): void
    {
        $parent = $this->parent();
        $this->activity();

        $login = $this->postJson('/api/login', ['email' => 'p@example.com', 'password' => 'password123'])->assertOk();
        $token = $login->json('token');
        $this->assertNotEmpty($token);

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/user')
            ->assertOk()->assertJsonPath('email_verified', false)->assertJsonPath('onboarding', 'verify_email');
        $this->withToken($token)->getJson('/api/activities')->assertOk()->assertJsonCount(1, 'data');
        $this->withToken($token)->getJson('/api/children')->assertOk();
        $this->withToken($token)->getJson('/api/conditions')->assertOk();
        $this->withToken($token)->getJson('/api/progress')->assertOk();

        $this->assertNull($parent->fresh()->email_verified_at);
    }

    // ---------------------------------------------------------------- transactions are refused

    public function test_an_unverified_parent_cannot_create_edit_or_delete_children(): void
    {
        $parent = $this->parent();
        $child = Child::create(['user_id' => $parent->id, 'name' => 'Old Profile']);

        $this->act($parent);
        $this->postJson('/api/children', ['name' => 'New'])->assertForbidden()->assertJsonPath('code', 'email_not_verified');
        $this->putJson("/api/children/{$child->id}", ['name' => 'Renamed'])->assertForbidden()->assertJsonPath('code', 'email_not_verified');
        $this->deleteJson("/api/children/{$child->id}")->assertForbidden()->assertJsonPath('code', 'email_not_verified');

        $this->assertSame(1, Child::count());
        $this->assertSame('Old Profile', $child->fresh()->name);
    }

    public function test_an_unverified_parent_cannot_complete_undo_or_journal(): void
    {
        $parent = $this->parent();
        $child = Child::create(['user_id' => $parent->id, 'name' => 'Sam']);
        $activity = $this->activity();
        $progress = ActivityProgress::create([
            'child_id' => $child->id, 'activity_id' => $activity->id, 'status' => 'completed', 'completed_at' => now(),
        ]);

        $this->act($parent);
        $this->postJson("/api/activities/{$activity->id}/complete", ['child_id' => $child->id])
            ->assertForbidden()->assertJsonPath('code', 'email_not_verified');
        $this->postJson("/api/progress/{$progress->id}/undo")
            ->assertForbidden()->assertJsonPath('code', 'email_not_verified');
        $this->postJson("/api/progress/{$progress->id}/journal", ['rating' => 5, 'note' => 'x'])
            ->assertForbidden()->assertJsonPath('code', 'email_not_verified');
        $this->postJson('/api/feedback', ['message' => 'Hello', 'rating' => 5])
            ->assertForbidden()->assertJsonPath('code', 'email_not_verified');

        $this->assertSame('completed', $progress->fresh()->status);
    }

    public function test_logging_out_and_in_or_a_new_token_does_not_lift_the_restriction(): void
    {
        $this->parent();

        $token = $this->postJson('/api/login', ['email' => 'p@example.com', 'password' => 'password123'])->json('token');

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->postJson('/api/children', ['name' => 'Sam'])->assertForbidden();

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->postJson('/api/logout')->assertOk();

        $token = $this->postJson('/api/login', ['email' => 'p@example.com', 'password' => 'password123'])->json('token');
        $this->app['auth']->forgetGuards();
        $this->withToken($token)->postJson('/api/children', ['name' => 'Sam'])->assertForbidden();

        $this->assertSame(0, Child::count());
    }

    public function test_a_verified_parent_can_do_these_things(): void
    {
        $parent = $this->parent(verified: true);

        $this->act($parent);
        $childId = $this->postJson('/api/children', ['name' => 'Sam'])->assertCreated()->json('data.child.id');
        $activity = $this->activity();
        $this->postJson("/api/activities/{$activity->id}/complete", ['child_id' => $childId])->assertCreated();
    }

    // ---------------------------------------------------------------- email change

    public function test_an_unverified_parent_can_change_the_email_and_gets_a_new_code_at_the_new_address(): void
    {
        $parent = $this->parent();
        $this->act($parent);

        Notification::fake();
        $this->postJson('/api/email/code/resend')->assertOk();
        $oldCode = null;
        Notification::assertSentTo($parent, VerificationCodeNotification::class, function ($n) use (&$oldCode) {
            $oldCode = $n->code;

            return true;
        });

        Notification::fake();
        $this->putJson('/api/profile', ['name' => 'Pat Parent', 'email' => 'Fresh@Example.com'])
            ->assertOk()->assertJsonPath('user.email', 'Fresh@Example.com')->assertJsonPath('user.email_verified', false);

        $parent->refresh();
        $this->assertSame('Fresh@Example.com', $parent->email);
        $this->assertNull($parent->email_verified_at);

        $newCode = null;
        Notification::assertSentTo($parent, VerificationCodeNotification::class, function ($n) use (&$newCode) {
            $newCode = $n->code;

            return true;
        });
        $this->assertNotNull($newCode);

        // The code for the old address no longer works (unless the random codes collide).
        if ($newCode !== $oldCode) {
            $this->postJson('/api/email/code/verify', ['code' => $oldCode])->assertStatus(422);
            $this->assertNull($parent->fresh()->email_verified_at);
        }

        $this->postJson('/api/email/code/verify', ['code' => $newCode])->assertOk();
        $this->assertNotNull($parent->fresh()->email_verified_at);
    }

    public function test_the_old_code_is_destroyed_even_if_the_new_one_cannot_be_sent(): void
    {
        $parent = $this->parent();
        $this->act($parent);
        $this->postJson('/api/email/code/resend')->assertOk();
        $this->assertNotNull(Cache::get("email-code:{$parent->id}"));

        // Make sending fail: no notification can be delivered.
        config(['mail.default' => 'smtp', 'mail.mailers.smtp.host' => '127.0.0.1', 'mail.mailers.smtp.port' => 1, 'mail.mailers.smtp.timeout' => 1]);

        $this->putJson('/api/profile', ['name' => 'Pat', 'email' => 'moved@example.com'])
            ->assertOk()->assertJsonPath('email_delivered', false);

        $this->assertNull(Cache::get("email-code:{$parent->id}"));
        $this->assertSame('moved@example.com', $parent->fresh()->email);
        $this->assertNull($parent->fresh()->email_verified_at);
    }

    public function test_a_new_email_must_be_unique_ignoring_letter_case_valid_and_not_reserved(): void
    {
        $this->parent('taken@example.com', verified: true);
        $mine = $this->parent('mine@example.com');
        $this->act($mine);

        foreach (['taken@example.com', 'TAKEN@Example.com', 'not-an-email'] as $bad) {
            $this->putJson('/api/profile', ['name' => 'Pat', 'email' => $bad])
                ->assertStatus(422)->assertJsonValidationErrors('email');
        }

        config(['theraplay.admin.email' => 'owner@example.com']);
        $this->putJson('/api/profile', ['name' => 'Pat', 'email' => 'OWNER@example.com'])->assertStatus(422);

        $this->assertSame('mine@example.com', $mine->fresh()->email);
    }

    public function test_the_current_email_in_a_different_case_is_not_a_change(): void
    {
        $mine = $this->parent('mine@example.com');
        $this->act($mine);
        Notification::fake();

        $this->putJson('/api/profile', ['name' => 'New Name', 'email' => 'MINE@example.com'])->assertOk();

        $this->assertSame('mine@example.com', $mine->fresh()->email);
        $this->assertSame('New Name', $mine->fresh()->name);
        Notification::assertNothingSent();
    }

    public function test_a_verified_email_cannot_be_changed_in_the_profile(): void
    {
        $mine = $this->parent('mine@example.com', verified: true);
        $this->act($mine);

        $this->putJson('/api/profile', ['name' => 'Pat', 'email' => 'other@example.com'])
            ->assertStatus(422)->assertJsonValidationErrors('email');

        $this->assertSame('mine@example.com', $mine->fresh()->email);
        $this->assertNotNull($mine->fresh()->email_verified_at);
    }

    public function test_changing_the_email_cannot_be_used_to_skip_verification(): void
    {
        $parent = $this->parent();
        $this->act($parent);
        Notification::fake();

        $this->putJson('/api/profile', ['name' => 'Pat', 'email' => 'new@example.com', 'email_verified_at' => now()->toDateTimeString()])
            ->assertOk();

        $this->assertNull($parent->fresh()->email_verified_at);
        $this->postJson('/api/children', ['name' => 'Sam'])->assertForbidden();
    }

    public function test_email_changes_are_rate_limited(): void
    {
        $parent = $this->parent('start@example.com');
        $this->act($parent);
        Notification::fake();

        foreach (range(1, 5) as $i) {
            $this->putJson('/api/profile', ['name' => 'Pat', 'email' => "a{$i}@example.com"])->assertOk();
        }

        $this->putJson('/api/profile', ['name' => 'Pat', 'email' => 'a6@example.com'])
            ->assertStatus(422)->assertJsonValidationErrors('email');
        $this->assertSame('a5@example.com', $parent->fresh()->email);
    }

    // ---------------------------------------------------------------- resend

    public function test_resend_has_a_cooldown_and_replaces_the_previous_code(): void
    {
        $parent = $this->parent();
        $this->act($parent);
        Notification::fake();

        config(['mail.default' => 'smtp']);
        $this->postJson('/api/email/code/resend')->assertOk()->assertJsonPath('status', 'sent');
        $this->postJson('/api/email/code/resend')
            ->assertStatus(429)->assertJsonPath('status', 'cooldown')->assertHeader('Retry-After');

        $entry = Cache::get("email-code:{$parent->id}");
        $entry['issued_at'] -= 60;
        Cache::put("email-code:{$parent->id}", $entry, now()->addMinutes(10));

        $this->postJson('/api/email/code/resend')->assertOk();
    }

    public function test_the_resend_response_never_contains_the_code(): void
    {
        $parent = $this->parent();
        $this->act($parent);
        $code = null;
        Notification::fake();

        $body = $this->postJson('/api/email/code/resend')->assertOk()->getContent();
        Notification::assertSentTo($parent, VerificationCodeNotification::class, function ($n) use (&$code) {
            $code = $n->code;

            return true;
        });

        $this->assertStringNotContainsString($code, $body);
    }

    // ---------------------------------------------------------------- Verify Later / routing state

    public function test_a_parent_who_skips_verification_stays_unverified_and_routing_follows_the_account_state(): void
    {
        $unverified = $this->parent('a@example.com');
        $verifiedNoChild = $this->parent('b@example.com', verified: true);
        $verifiedWithChild = $this->parent('c@example.com', verified: true);
        Child::create(['user_id' => $verifiedWithChild->id, 'name' => 'Sam']);

        $this->assertSame('verify_email', $unverified->onboardingStep());
        $this->assertSame('create_child', $verifiedNoChild->onboardingStep());
        $this->assertSame('complete', $verifiedWithChild->onboardingStep());

        // Browsing with the registration token changes nothing about the account.
        $this->act($unverified);
        $this->getJson('/api/activities')->assertOk();
        $this->getJson('/api/user')->assertOk();
        $this->assertNull($unverified->fresh()->email_verified_at);
        $this->assertSame(0, Child::where('user_id', $unverified->id)->count());
    }

    public function test_an_admin_is_not_blocked_by_the_verified_parent_rule_and_keeps_admin_routes(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'adm@example.com', 'password' => 'password123']);
        $admin->forceFill(['role' => 'admin'])->save(); // not verified on purpose

        $this->act($admin);
        $this->getJson('/api/admin/activity-feedback')->assertOk();
        // Parent-only routes stay parent-only.
        $this->postJson('/api/children', ['name' => 'X'])->assertForbidden();
    }
}
