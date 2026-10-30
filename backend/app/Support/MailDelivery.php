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
        return ! in_array(config('mail.default'), ['log', 'array'], true);
    }
}
