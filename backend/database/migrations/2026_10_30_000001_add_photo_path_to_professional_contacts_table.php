<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Nullable, so existing contacts keep working without a picture.
    public function up(): void
    {
        Schema::table('professional_contacts', function (Blueprint $table) {
            $table->string('photo_path')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('professional_contacts', function (Blueprint $table) {
            $table->dropColumn('photo_path');
        });
    }
};
