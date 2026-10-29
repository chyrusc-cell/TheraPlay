<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

/**
 * The Developer Team card on the Contact Us page: one row (id 1) edited by
 * admins. Until an admin saves it, the original SAMPLE details are shown and
 * marked as sample (is_sample), so no unofficial details are presented as real.
 */
class DeveloperTeam extends Model
{
    protected $table = 'developer_team';

    protected $fillable = ['name', 'description', 'email', 'phone'];

    public const SAMPLE = [
        'name' => 'TheraPlay Development Team',
        'description' => 'The team responsible for developing and maintaining the TheraPlay website.',
        'email' => 'theraplay.team@example.com',
        'phone' => '+63 900 123 4567',
    ];

    // The details to show: the saved row, or the sample when nothing is saved
    // yet (also when the migration has not been run).
    public static function current(): array
    {
        $row = Schema::hasTable('developer_team') ? static::query()->find(1) : null;

        if (! $row) {
            return self::SAMPLE + ['is_sample' => true];
        }

        return [
            'name' => $row->name,
            'description' => $row->description,
            'email' => $row->email,
            'phone' => $row->phone,
            'is_sample' => false,
        ];
    }
}
