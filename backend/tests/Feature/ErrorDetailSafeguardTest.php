<?php

namespace Tests\Feature;

use App\Providers\AppServiceProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ErrorDetailSafeguardTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_errors_do_not_expose_exception_details_when_debug_is_off(): void
    {
        config(['app.debug' => false]);

        foreach (['/api/activities/9999', '/api/no-such-route'] as $url) {
            $body = $this->getJson($url)->assertNotFound()->json();

            $this->assertArrayNotHasKey('exception', $body);
            $this->assertArrayNotHasKey('trace', $body);
            $this->assertArrayNotHasKey('file', $body);
            $this->assertStringNotContainsString('App\\Models', json_encode($body));
        }
    }

    public function test_debug_is_forced_off_outside_local_and_testing_even_if_env_says_true(): void
    {
        foreach (['production', 'staging'] as $environment) {
            $this->app['env'] = $environment;
            config(['app.debug' => true]);

            (new AppServiceProvider($this->app))->boot();

            $this->assertFalse(config('app.debug'), $environment);
        }
    }

    public function test_debug_is_left_alone_in_local_development(): void
    {
        $this->app['env'] = 'local';
        config(['app.debug' => true]);

        (new AppServiceProvider($this->app))->boot();

        $this->assertTrue(config('app.debug'));
    }
}
