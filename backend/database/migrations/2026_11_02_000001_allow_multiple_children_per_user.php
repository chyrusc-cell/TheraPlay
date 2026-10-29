<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // children.user_id was UNIQUE (one child per parent). The unique index is
    // dropped so a parent can have several children; the foreign key stays (it
    // needs an index, which MySQL recreates for it). No rows are touched.
    public function up(): void
    {
        Schema::table('children', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropUnique(['user_id']);
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        // Only possible while no parent has more than one child.
        Schema::table('children', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->unique('user_id');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }
};
