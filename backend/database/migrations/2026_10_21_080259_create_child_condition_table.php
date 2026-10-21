<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('child_condition', function (Blueprint $table) {
            $table->id();

            $table->foreignId('child_id')
                ->constrained('children')
                ->cascadeOnDelete();

            $table->foreignId('condition_id')
                ->constrained('conditions')
                ->cascadeOnDelete();

            $table->timestamps();

            $table->unique(['child_id', 'condition_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('child_condition');
    }
};
