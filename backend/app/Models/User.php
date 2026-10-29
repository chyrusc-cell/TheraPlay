<?php

namespace App\Models;

use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'contact_number',
        'role',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'photo_path',
    ];

    // The picture is exposed only as a URL (never the stored path).
    protected $appends = ['photo_url'];

    public const PHOTO_DIRECTORY = 'profile-photos';

    // Only paths made by the upload code count.
    public function hasPhoto(): bool
    {
        return is_string($this->photo_path)
            && str_starts_with($this->photo_path, self::PHOTO_DIRECTORY.'/');
    }

    // The URL of the account's own picture route (the file is private, so the
    // app fetches it with the login token). The v= part changes when the
    // picture changes.
    public function getPhotoUrlAttribute(): ?string
    {
        return $this->hasPhoto()
            ? url('/api/profile/photo').'?v='.substr(md5($this->photo_path), 0, 8)
            : null;
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    // The oldest child (a parent can have several: see children()). Kept for
    // the "has any child" checks.
    public function child(): HasOne
    {
        return $this->hasOne(Child::class)->oldestOfMany();
    }

    public function children(): HasMany
    {
        return $this->hasMany(Child::class);
    }

    public function createdActivities(): HasMany
    {
        return $this->hasMany(Activity::class, 'created_by');
    }
}
