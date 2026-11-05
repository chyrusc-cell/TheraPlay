<?php

/*
 * Cross-origin rules for the API. Only the origins listed in
 * CORS_ALLOWED_ORIGINS (comma separated) may call it from a browser. The default
 * is the local Vite dev server; set it to your real frontend address for a
 * deployment (see .env.example). The API uses bearer tokens, not cookies, so
 * credentials are not allowed.
 */
return [

    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173'))
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 600,

    'supports_credentials' => false,

];
