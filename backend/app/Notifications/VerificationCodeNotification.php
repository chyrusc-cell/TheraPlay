<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * The email with the six-digit verification code. Sent synchronously (never
 * queued) so the code is not written to a queue table. The code is only in the
 * message; the app does not log it.
 */
class VerificationCodeNotification extends Notification
{
    public function __construct(
        public readonly string $code,
        private readonly int $minutes,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Your TheraPlay verification code')
            ->markdown('mail.verification-code', [
                'code' => $this->code,
                'minutes' => $this->minutes,
            ]);
    }
}
