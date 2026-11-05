<?php

use App\Models\Category;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Makes sure the six required categories exist. It only ADDS a missing one
 * (matched ignoring letter case, so an existing row is never duplicated) and
 * never renames, updates or deletes anything, so activities keep their category.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (Category::REQUIRED_NAMES as $name) {
            $exists = DB::table('categories')
                ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
                ->exists();

            if (! $exists) {
                DB::table('categories')->insert([
                    'name' => $name,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        // Nothing to undo: the rows may already be in use by activities.
    }
};
