<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Which conditions an activity is relevant to, plus an explicit "suitable for
    // all conditions" flag. Existing activities start with neither, so (by the
    // matching rule) they are NOT shown to a child filtered by conditions until an
    // admin assigns conditions or ticks "suitable for all".
    public function up(): void
    {
        Schema::create('activity_condition', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activity_id')->constrained('activities')->cascadeOnDelete();
            $table->foreignId('condition_id')->constrained('conditions')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['activity_id', 'condition_id']);
        });

        Schema::table('activities', function (Blueprint $table) {
            $table->boolean('is_for_all_conditions')->default(false)->after('is_published');
        });
    }

    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->dropColumn('is_for_all_conditions');
        });

        Schema::dropIfExists('activity_condition');
    }
};
