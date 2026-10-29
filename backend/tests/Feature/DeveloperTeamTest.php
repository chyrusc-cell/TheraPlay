<?php

namespace Tests\Feature;

use App\Models\DeveloperTeam;
use App\Models\ProfessionalContact;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DeveloperTeamTest extends TestCase
{
    use RefreshDatabase;

    private function login(string $role): void
    {
        $user = User::create(['name' => 'U', 'email' => $role.'@example.com', 'password' => 'password123']);
        $user->forceFill(['role' => $role])->save();
        Sanctum::actingAs($user);
    }

    private function payload(array $extra = []): array
    {
        return array_merge([
            'name' => 'Team Alpha',
            'description' => 'We build TheraPlay.',
            'email' => 'alpha@theraplay.test',
            'phone' => '+63 917 000 1111',
        ], $extra);
    }

    public function test_until_an_admin_saves_it_the_sample_details_are_shown_and_marked_as_sample(): void
    {
        $this->getJson('/api/developer-team')
            ->assertOk()
            ->assertJsonPath('data.name', 'TheraPlay Development Team')
            ->assertJsonPath('data.email', 'theraplay.team@example.com')
            ->assertJsonPath('data.phone', '+63 900 123 4567')
            ->assertJsonPath('data.is_sample', true);
        $this->assertDatabaseCount('developer_team', 0);
    }

    public function test_an_admin_can_save_and_the_public_card_shows_it(): void
    {
        $this->login('admin');

        $this->putJson('/api/admin/developer-team', $this->payload())
            ->assertOk()
            ->assertJsonPath('data.name', 'Team Alpha')
            ->assertJsonPath('data.is_sample', false);

        $this->app['auth']->forgetGuards();
        $this->getJson('/api/developer-team')
            ->assertOk()
            ->assertJsonPath('data.email', 'alpha@theraplay.test')
            ->assertJsonPath('data.phone', '+63 917 000 1111')
            ->assertJsonPath('data.is_sample', false);
    }

    public function test_saving_again_updates_the_same_single_row(): void
    {
        $this->login('admin');

        $this->putJson('/api/admin/developer-team', $this->payload())->assertOk();
        $this->putJson('/api/admin/developer-team', $this->payload(['name' => 'Team Beta', 'phone' => null]))->assertOk();

        $this->assertDatabaseCount('developer_team', 1);
        $this->assertSame('Team Beta', DeveloperTeam::find(1)->name);
        $this->assertNull(DeveloperTeam::find(1)->phone);
    }

    public function test_it_is_kept_separate_from_the_professional_contacts(): void
    {
        $contact = ProfessionalContact::create(['name' => 'Dr. Ana', 'title' => 'OT', 'email' => 'ana@example.com']);
        $this->login('admin');

        $this->putJson('/api/admin/developer-team', $this->payload())->assertOk();

        $this->assertDatabaseCount('professional_contacts', 1);
        $this->assertSame('Dr. Ana', $contact->fresh()->name);
        $this->assertSame('Dr. Ana', $this->getJson('/api/contacts')->json('data.0.name'));
    }

    public function test_input_is_validated(): void
    {
        $this->login('admin');
        $url = '/api/admin/developer-team';

        $this->putJson($url, $this->payload(['name' => '']))->assertStatus(422)->assertJsonValidationErrors('name');
        $this->putJson($url, $this->payload(['email' => 'not-an-email']))->assertStatus(422)->assertJsonValidationErrors('email');
        $this->putJson($url, $this->payload(['phone' => 'call me maybe']))->assertStatus(422)->assertJsonValidationErrors('phone');
        $this->putJson($url, $this->payload(['description' => str_repeat('x', 2001)]))->assertStatus(422)->assertJsonValidationErrors('description');
        $this->assertDatabaseCount('developer_team', 0);
    }

    public function test_guests_and_parents_cannot_read_or_change_the_admin_endpoint(): void
    {
        $this->getJson('/api/admin/developer-team')->assertUnauthorized();
        $this->putJson('/api/admin/developer-team', $this->payload())->assertUnauthorized();

        $this->login('parent');
        $this->getJson('/api/admin/developer-team')->assertForbidden();
        $this->putJson('/api/admin/developer-team', $this->payload())->assertForbidden();
        $this->assertDatabaseCount('developer_team', 0);
    }
}
