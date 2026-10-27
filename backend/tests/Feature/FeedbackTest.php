<?php

namespace Tests\Feature;

use App\Models\Feedback;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FeedbackTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(string $email, string $role = 'parent', string $name = 'Test Parent'): User
    {
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => 'password123',
        ]);

        $user->forceFill(['role' => $role])->save();

        return $user;
    }

    private function makeFeedback(?User $user, string $message = 'Great app', ?int $rating = 5, ?string $createdAt = null): Feedback
    {
        $feedback = new Feedback(['message' => $message, 'rating' => $rating]);
        $feedback->user_id = $user?->id;

        if ($createdAt) {
            $feedback->created_at = $createdAt;
        }

        $feedback->save();

        return $feedback;
    }

    // --- Submitting feedback ---

    public function test_guests_cannot_submit_feedback(): void
    {
        $this->postJson('/api/feedback', ['message' => 'Hello'])->assertUnauthorized();

        $this->assertSame(0, Feedback::count());
    }

    public function test_authenticated_parent_can_submit_valid_feedback(): void
    {
        $parent = $this->makeUser('parent@example.com');
        Sanctum::actingAs($parent);

        $response = $this->postJson('/api/feedback', [
            'message' => 'The activities are very helpful.',
            'rating' => 4,
        ])
            ->assertCreated()
            ->assertJsonPath('message', 'Thank you for your feedback.')
            ->assertJsonPath('data.feedback.message', 'The activities are very helpful.')
            ->assertJsonPath('data.feedback.rating', 4);

        $this->assertDatabaseHas('feedback', [
            'id' => $response->json('data.feedback.id'),
            'user_id' => $parent->id,
            'message' => 'The activities are very helpful.',
            'rating' => 4,
        ]);
    }

    public function test_rating_is_optional(): void
    {
        Sanctum::actingAs($this->makeUser('parent@example.com'));

        $this->postJson('/api/feedback', ['message' => 'No rating needed.'])
            ->assertCreated()
            ->assertJsonPath('data.feedback.rating', null);
    }

    public function test_forged_user_id_cannot_change_the_owner(): void
    {
        $me = $this->makeUser('me@example.com');
        $other = $this->makeUser('other@example.com');
        Sanctum::actingAs($me);

        $response = $this->postJson('/api/feedback', [
            'message' => 'Trying to impersonate.',
            'user_id' => $other->id,
        ])->assertCreated();

        $this->assertDatabaseHas('feedback', [
            'id' => $response->json('data.feedback.id'),
            'user_id' => $me->id,
        ]);
        $this->assertSame(0, Feedback::where('user_id', $other->id)->count());
    }

    public function test_missing_or_empty_messages_fail_validation(): void
    {
        Sanctum::actingAs($this->makeUser('parent@example.com'));

        $this->postJson('/api/feedback', [])
            ->assertStatus(422)->assertJsonValidationErrors('message');

        $this->postJson('/api/feedback', ['message' => ''])
            ->assertStatus(422)->assertJsonValidationErrors('message');

        $this->postJson('/api/feedback', ['message' => '     '])
            ->assertStatus(422)->assertJsonValidationErrors('message');

        $this->postJson('/api/feedback', ['message' => str_repeat('a', 5001)])
            ->assertStatus(422)->assertJsonValidationErrors('message');

        $this->assertSame(0, Feedback::count());
    }

    public function test_invalid_ratings_fail_validation(): void
    {
        Sanctum::actingAs($this->makeUser('parent@example.com'));

        foreach ([0, 6, -1, 3.5, 'abc', [3]] as $rating) {
            $this->postJson('/api/feedback', ['message' => 'Hi', 'rating' => $rating])
                ->assertStatus(422)
                ->assertJsonValidationErrors('rating');
        }

        $this->assertSame(0, Feedback::count());
    }

    public function test_ratings_from_one_to_five_are_accepted(): void
    {
        Sanctum::actingAs($this->makeUser('parent@example.com'));

        foreach ([1, 2, 3, 4, 5] as $rating) {
            $this->postJson('/api/feedback', ['message' => "Rated {$rating}", 'rating' => $rating])
                ->assertCreated()
                ->assertJsonPath('data.feedback.rating', $rating);
        }

        $this->assertSame(5, Feedback::count());
    }

    public function test_admins_cannot_submit_feedback(): void
    {
        Sanctum::actingAs($this->makeUser('admin@example.com', 'admin'));

        $this->postJson('/api/feedback', ['message' => 'Admin note'])->assertForbidden();

        $this->assertSame(0, Feedback::count());
    }

    // --- Admin feedback list ---

    public function test_guests_cannot_list_feedback(): void
    {
        $this->getJson('/api/admin/feedback')->assertUnauthorized();
    }

    public function test_parents_cannot_list_feedback(): void
    {
        $parent = $this->makeUser('parent@example.com');
        $this->makeFeedback($parent);
        Sanctum::actingAs($parent);

        $this->getJson('/api/admin/feedback')->assertForbidden();
    }

    public function test_admin_can_list_feedback_newest_first_with_submitter_details(): void
    {
        $parent = $this->makeUser('parent@example.com', 'parent', 'Pat Parent');
        $this->makeFeedback($parent, 'Older', 3, '2026-10-01 10:00:00');
        $this->makeFeedback($parent, 'Newest', 5, '2026-10-20 10:00:00');
        $this->makeFeedback($parent, 'Middle', null, '2026-10-10 10:00:00');
        Sanctum::actingAs($this->makeUser('admin@example.com', 'admin'));

        $response = $this->getJson('/api/admin/feedback')->assertOk();

        $this->assertSame(
            ['Newest', 'Middle', 'Older'],
            collect($response->json('data'))->pluck('message')->all()
        );

        $first = $response->json('data.0');

        $this->assertEqualsCanonicalizing(
            ['id', 'message', 'rating', 'created_at', 'user'],
            array_keys($first)
        );
        $this->assertSame(5, $first['rating']);
        $this->assertSame(
            ['id' => $parent->id, 'name' => 'Pat Parent', 'email' => 'parent@example.com'],
            $first['user']
        );
    }

    public function test_sensitive_user_fields_are_never_exposed(): void
    {
        $parent = $this->makeUser('parent@example.com');
        $parent->createToken('device');
        $this->makeFeedback($parent);
        Sanctum::actingAs($this->makeUser('admin@example.com', 'admin'));

        $body = $this->getJson('/api/admin/feedback')->assertOk()->getContent();

        foreach (['password', 'remember_token', 'token', '$2y$', 'role', 'contact_number'] as $secret) {
            $this->assertStringNotContainsString($secret, $body);
        }
    }

    public function test_feedback_survives_deletion_of_its_user(): void
    {
        $parent = $this->makeUser('parent@example.com');
        $feedback = $this->makeFeedback($parent, 'Still here');
        Sanctum::actingAs($this->makeUser('admin@example.com', 'admin'));

        $parent->delete();

        $this->assertDatabaseHas('feedback', ['id' => $feedback->id, 'user_id' => null]);

        $this->getJson('/api/admin/feedback')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.message', 'Still here')
            ->assertJsonPath('data.0.user', null);
    }
}
