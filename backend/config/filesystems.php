<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application for file storage.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Below you may configure as many filesystem disks as necessary, and you
    | may even configure multiple disks for the same driver. Examples for
    | most supported storage drivers are configured here for reference.
    |
    | Supported drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
            'report' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => rtrim(env('APP_URL', 'http://localhost'), '/').'/storage',
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
            'report' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    /*
    |--------------------------------------------------------------------------
    | Activity Material Uploads
    |--------------------------------------------------------------------------
    |
    | Files attached to activities are kept on a PRIVATE disk (never linked
    | into public/) and are only served through the API. The limits can be
    | changed with ACTIVITY_MATERIAL_MAX_KB / ACTIVITY_MATERIAL_MAX_FILES.
    |
    */

    'activity_materials' => [
        'disk' => 'local',
        'max_kb' => (int) env('ACTIVITY_MATERIAL_MAX_KB', 10240),
        'max_files' => (int) env('ACTIVITY_MATERIAL_MAX_FILES', 10),

        // Card thumbnails of PDF attachments (App\Support\PdfThumbnail): page 1 is
        // rendered by a small Node script, so Node must be installed on the server
        // (THUMBNAIL_NODE_BINARY if it is not "node" on the PATH) and
        // "npm install" run once in backend/.
        'thumbnail' => [
            'node' => env('THUMBNAIL_NODE_BINARY', 'node'),
            'script' => base_path('tools/pdf-thumbnail.mjs'),
            'width' => (int) env('THUMBNAIL_WIDTH', 600),
            'timeout' => (int) env('THUMBNAIL_TIMEOUT', 60),
        ],
    ],

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
