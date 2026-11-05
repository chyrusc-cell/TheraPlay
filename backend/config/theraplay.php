<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Predefined administrator account
    |--------------------------------------------------------------------------
    |
    | The official TheraPlay administrator. `php artisan admin:initialize`
    | creates it from these values (see app/Console/Commands/InitializeAdmin.php).
    | The password is supplied only through THERAPLAY_ADMIN_PASSWORD in the
    | owner's own .env; it is never stored in source code and is hashed before it
    | is saved. This address is reserved: ordinary registration refuses it.
    |
    */

    'admin' => [
        'email' => env('THERAPLAY_ADMIN_EMAIL', 'theraplay.system@gmail.com'),
        'password' => env('THERAPLAY_ADMIN_PASSWORD'),
        'name' => 'TheraPlay Administrator',
    ],

];
