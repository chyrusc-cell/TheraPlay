<x-mail::message>
# Verify your email address

Welcome to TheraPlay! Enter this six-digit code in the app to verify the email address of your parent account.

<x-mail::panel>
<span style="font-size: 30px; font-weight: bold; letter-spacing: 8px;">{{ $code }}</span>
</x-mail::panel>

This code expires in **{{ $minutes }} minutes** and can be used once. Asking for a new code makes this one stop working.

**Do not share this code with anyone.** TheraPlay will never ask you for it by phone, chat or email. If you did not create a TheraPlay account, you can ignore this message.

Thanks,<br>
The TheraPlay team
</x-mail::message>
