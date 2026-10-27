<?php

namespace Database\Seeders;

use App\Models\Activity;
use App\Models\Category;
use Illuminate\Database\Seeder;

/**
 * Adds the three activities that were previously hardcoded in
 * src/ActivityDetails.jsx. It only adds rows that do not exist yet
 * (matched by name/title) and never updates or deletes anything.
 *
 * Run it with: php artisan db:seed --class=ActivitySeeder
 */
class ActivitySeeder extends Seeder
{
    public function run(): void
    {
        $activities = [
            [
                'category' => 'Executive Functioning',
                'title' => 'Memory Match',
                'difficulty' => 'Easy',
                'description' => 'Match pairs of cards to practice memory and concentration.',
                'objective' => 'Improve memory and concentration through matching activities.',
                'instructions' => [
                    'Look at the cards carefully.',
                    'Remember the position of each item.',
                    'Match the cards with the same image.',
                    'Continue until all pairs are matched.',
                ],
                'materials' => ['Activity cards', 'Matching board'],
            ],
            [
                'category' => 'Fine Motor Skills',
                'title' => 'Shape Sorting',
                'difficulty' => 'Medium',
                'description' => 'Sort different shapes to practice hand coordination.',
                'objective' => 'Improve hand coordination by sorting different shapes.',
                'instructions' => [
                    'Look at the different shapes.',
                    'Pick up one shape at a time.',
                    'Place each shape in its correct location.',
                    'Repeat until all shapes are sorted.',
                ],
                'materials' => ['Shape pieces', 'Sorting board'],
            ],
            [
                'category' => 'Functional Skills',
                'title' => 'Button Practice',
                'difficulty' => 'Easy',
                'description' => 'Practice buttoning and unbuttoning to build everyday skills.',
                'objective' => 'Improve fine motor skills and hand-eye coordination by practicing buttons.',
                'instructions' => [
                    'Place the button board in front of you.',
                    'Hold the button with your fingers.',
                    'Practice buttoning and unbuttoning.',
                    'Repeat the activity several times.',
                ],
                'materials' => ['Button board', 'Shirt with buttons'],
            ],
        ];

        foreach ($activities as $data) {
            $category = Category::firstOrCreate(['name' => $data['category']]);

            Activity::firstOrCreate(
                ['title' => $data['title']],
                [
                    'category_id' => $category->id,
                    'description' => $data['description'],
                    'objective' => $data['objective'],
                    'instructions' => $data['instructions'],
                    'materials' => $data['materials'],
                    'difficulty' => $data['difficulty'],
                    'is_published' => true,
                ]
            );
        }
    }
}
