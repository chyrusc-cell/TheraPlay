<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    // The only categories TheraPlay uses. The set is fixed: admins cannot add,
    // rename or delete them (descriptions stay editable), and an activity must
    // belong to one of them.
    public const REQUIRED_NAMES = [
        'Executive Function',
        'Fine Motor Skills',
        'Functioning Skills',
        'Handwriting',
        'Sensory',
        'Visual',
    ];

    public static function isRequiredName(?string $name): bool
    {
        return in_array($name, self::REQUIRED_NAMES, true);
    }

    protected $fillable = [
        'name',
        'description',
    ];

    public function activities(): HasMany
    {
        return $this->hasMany(Activity::class);
    }
}
