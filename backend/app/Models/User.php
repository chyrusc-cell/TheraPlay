<?php

namespace App\Models;

use App\Notifications\VerifyEmailAddress;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable implements MustVerifyEmail
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

    // ---------------------------------------------------------------- email

    // The verification email for the CURRENT address (a new account, or a resend).
    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new VerifyEmailAddress($this->id, $this->email));
    }

    // A requested new address waits here (not in the users table) until its owner
    // clicks the link sent to it. It expires with the link, and the account keeps
    // working with the old, still-verified address in the meantime.
    private function pendingEmailKey(): string
    {
        return 'pending-email:'.$this->id;
    }

    public function pendingEmail(): ?string
    {
        $pending = Cache::get($this->pendingEmailKey());

        return is_string($pending) ? $pending : null;
    }

    public function setPendingEmail(string $email): void
    {
        Cache::put(
            $this->pendingEmailKey(),
            $email,
            now()->addMinutes((int) config('auth.verification.expire', 60))
        );
    }

    public function clearPendingEmail(): void
    {
        Cache::forget($this->pendingEmailKey());
    }

    // Sends the verification link for a requested new address, to THAT address.
    public function sendPendingEmailVerification(string $email): void
    {
        \Illuminate\Support\Facades\Notification::route('mail', $email)
            ->notify(new VerifyEmailAddress($this->id, $email));
    }

    // True when this account must verify its email before using the app. Only
    // parents created at or after the configured date are held back (see
    // config/auth.php), so existing accounts are never locked out.
    public function mustVerifyEmailNow(): bool
    {
        $from = config('auth.verification.enforced_from');

        if (! $from || $this->hasVerifiedEmail() || $this->role === 'admin') {
            return false;
        }

        return $this->created_at !== null && $this->created_at->greaterThanOrEqualTo(Carbon::parse($from));
    }

    // What the app needs to know about the account itself (GET /api/user and the
    // profile responses). Never the password, tokens or the stored photo path.
    public function accountSummary(): array
    {
        return $this->toArray() + [
            'email_verified' => $this->hasVerifiedEmail(),
            'pending_email' => $this->pendingEmail(),
            'email_verification_required' => $this->mustVerifyEmailNow(),
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
