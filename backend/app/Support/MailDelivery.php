<?php

namespace App\Support;

class MailDelivery
{
    /**
     * The "log" and "array" mail drivers never deliver anything. Real delivery
     * needs a real transport (for example smtp). Responses use this so the app
     * never tells someone an email is on its way when it only went to the log.
     */
    public static function isConfigured(): bool
    {
        $default = config('mail.default');

        if (in_array($default, ['log', 'array'], true)) {
            return false;
        }

        // An SMTP mailer without a host cannot connect to anything.
        if (config("mail.mailers.{$default}.transport") === 'smtp'
            && blank(config("mail.mailers.{$default}.url"))
            && blank(config("mail.mailers.{$default}.host"))) {
            return false;
        }

        return true;
    }
}
