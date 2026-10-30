<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

/**
 * The email with the verification link. It is used both for a new account and
 * for a changed email address (then it goes to the NEW address).
 *
 * The link is a time-limited signed URL. It points at the React page
 * ({FRONTEND_URL}/verify-email), which sends the same signed request to the API.
 * The signature is RELATIVE (path only), so it is valid whichever host the API
 * is reached on.
 */
class VerifyEmailAddress extends Notification
{
    public function __construct(
        private readonly int $userId,
        private readonly string $email,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /** The API path + query that the frontend page must call (POST). */
    public static function signedPath(int $userId, string $email): string
    {
        return URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes((int) config('auth.verification.expire', 60)),
            ['id' => $userId, 'hash' => sha1($email)],
            absolute: false,
        );
    }

    public function link(): string
    {
        $query = parse_url(self::signedPath($this->userId, $this->email), PHP_URL_QUERY);

        return rtrim(config('app.frontend_url'), '/').'/verify-email'
            .'?id='.$this->userId
            .'&hash='.sha1($this->email)
            .'&'.$query;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $minutes = (int) config('auth.verification.expire', 60);

        return (new MailMessage)
            ->subject('Verify your email address')
            ->line('Please confirm that this is your email address for your TheraPlay account.')
            ->action('Verify email address', $this->link())
            ->line("This link expires in {$minutes} minutes and can be used once.")
            ->line('If you did not create or change a TheraPlay account, you can ignore this email.');
    }
}
