<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            // Archiving is separate from publishing: archived_at marks the archive,
            // archived_was_published remembers the publication state to restore.
            $table->timestamp('archived_at')->nullable()->after('is_published');
            $table->boolean('archived_was_published')->nullable()->after('archived_at');
        });
    }

    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->dropColumn(['archived_at', 'archived_was_published']);
        });
    }
};
