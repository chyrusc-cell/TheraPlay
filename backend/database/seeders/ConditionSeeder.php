<?php

namespace Database\Seeders;

use App\Models\Condition;
use Illuminate\Database\Seeder;

/**
 * OPTIONAL starting list of parent-selectable conditions (they are parent-reported,
 * not diagnoses). It is not part of DatabaseSeeder and nothing runs it
 * automatically: run it once with  php artisan db:seed --class=ConditionSeeder
 * and then manage the list in the admin pages. Safe to re-run (no duplicates).
 */
class ConditionSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            'Autism Spectrum Disorder',
            'ADHD',
            'Developmental Delay',
            'Down Syndrome',
            'Cerebral Palsy',
            'Speech and Language Delay',
            'Sensory Processing Difficulties',
        ] as $name) {
            Condition::firstOrCreate(['name' => $name], ['is_active' => true]);
        }
    }
}
