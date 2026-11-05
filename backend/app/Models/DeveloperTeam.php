<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

/**
 * The Developer Team card on the Contact Us page: one row (id 1) edited by
 * admins. Until an admin saves it, the original SAMPLE details are shown and
 * marked as sample (is_sample), so no unofficial details are presented as real.
 *
 * It can list several emails and phone numbers (emails / phones). The single
 * email / phone columns keep the first entry of each for older code.
 */
class DeveloperTeam extends Model
{
    protected $table = 'developer_team';

    protected $fillable = ['name', 'description', 'email', 'phone', 'emails', 'phones'];

    protected function casts(): array
    {
        return [
            'emails' => 'array',
            'phones' => 'array',
        ];
    }

    public const SAMPLE = [
        'name' => 'TheraPlay Development Team',
        'description' => 'The team responsible for developing and maintaining the TheraPlay website.',
        'email' => 'theraplay.team@example.com',
        'phone' => '+63 900 123 4567',
    ];

    // True once the emails / phones columns exist (the migration has been run).
    public static function supportsLists(): bool
    {
        return Schema::hasTable('developer_team')
            && Schema::hasColumn('developer_team', 'emails');
    }

    // The details to show: the saved row, or the sample when nothing is saved
    // yet (also when the migration has not been run).
    public static function current(): array
    {
        $row = Schema::hasTable('developer_team') ? static::query()->find(1) : null;

        if (! $row) {
            return self::SAMPLE + [
                'emails' => [self::SAMPLE['email']],
                'phones' => [self::SAMPLE['phone']],
                'is_sample' => true,
            ];
        }

        $emails = self::list($row->emails ?? null, $row->email);
        $phones = self::list($row->phones ?? null, $row->phone);

        return [
            'name' => $row->name,
            'description' => $row->description,
            'email' => $emails[0] ?? null,
            'phone' => $phones[0] ?? null,
            'emails' => $emails,
            'phones' => $phones,
            'is_sample' => false,
        ];
    }

    // The saved list, or (for rows from before the lists existed) the single value.
    private static function list(?array $list, ?string $single): array
    {
        $values = $list ?? ($single ? [$single] : []);

        return array_values(array_filter($values, fn ($value) => is_string($value) && $value !== ''));
    }
}
