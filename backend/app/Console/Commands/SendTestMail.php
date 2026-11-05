<?php

namespace App\Console\Commands;

use App\Support\MailDelivery;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Lets the project owner check a real mail setup (SMTP values in .env) without
 * registering an account:  php artisan mail:test someone@example.com
 * With the log/array drivers nothing can be delivered, so it says so instead of
 * pretending. A successful send only means the mail server accepted the message;
 * check the inbox (and spam folder) to confirm it arrived.
 */
class SendTestMail extends Command
{
    protected $signature = 'mail:test {address : Where to send the test message}';

    protected $description = 'Send a test email with the configured mail settings';

    public function handle(): int
    {
        $address = (string) $this->argument('address');

        if (! filter_var($address, FILTER_VALIDATE_EMAIL)) {
            $this->error('That is not a valid email address.');

            return self::FAILURE;
        }

        if (! MailDelivery::isConfigured()) {
            $this->warn('MAIL_MAILER is "'.config('mail.default').'", which never delivers anything. Set MAIL_MAILER=smtp and the MAIL_* values in .env (see .env.example) first.');

            return self::FAILURE;
        }

        try {
            Mail::raw('This is a test message from TheraPlay. If you can read it, outgoing email works.', function ($message) use ($address) {
                $message->to($address)->subject('TheraPlay mail test');
            });
        } catch (Throwable $e) {
            // The class name only: the message can contain the server address or login.
            $this->error('The mail server did not accept the message ('.class_basename($e).'). Check MAIL_HOST, MAIL_PORT, MAIL_SCHEME, MAIL_USERNAME and MAIL_PASSWORD.');

            return self::FAILURE;
        }

        $this->info("The mail server accepted the test message for {$address}. Check that inbox (and the spam folder) to confirm it arrived.");

        return self::SUCCESS;
    }
}
