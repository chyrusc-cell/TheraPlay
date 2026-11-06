// Philippine mobile numbers, shown and saved as "+63 912 345 6789".
//
// The "+63" is fixed; a person types only the 10 digits after it. The first digit
// must be 9 (a leading 0, or a pasted "+63" / "63", is dropped), and there can be
// no more than 10 digits.

export const PHONE_PREFIX = '+63';
export const PHONE_DIGITS = 10;

// The up-to-10 digits of a typed, pasted or saved number (no "+63", no leading 0).
export const phoneDigits = (value) => {
    let raw = String(value ?? '').trim();

    // The saved form starts with the fixed "+63"; it is not part of the 10 digits.
    if (raw.startsWith(PHONE_PREFIX)) {
        raw = raw.slice(PHONE_PREFIX.length);
    }

    let digits = raw.replace(/\D/g, '');

    // A number pasted with the country code but without "+" (63 912 ...).
    if (digits.startsWith('63') && digits.length > PHONE_DIGITS) {
        digits = digits.slice(2);
    }

    // 0912... is typed by habit; the 0 is not part of the number after +63.
    digits = digits.replace(/^0+/, '');

    // Only a mobile number (9...) is accepted.
    if (digits && digits[0] !== '9') {
        return '';
    }

    return digits.slice(0, PHONE_DIGITS);
};

// "9123456789" -> "912 345 6789" (partial numbers are grouped as far as they go).
export const formatPhoneDigits = (digits) =>
    [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)].filter(Boolean).join(' ');

// What is saved: "+63 912 345 6789", or '' when no digits were entered.
export const toStoredPhone = (digits) =>
    digits ? `${PHONE_PREFIX} ${formatPhoneDigits(digits)}` : '';

export const isCompletePhone = (value) => phoneDigits(value).length === PHONE_DIGITS;

export const PHONE_ERROR = 'Enter a 10-digit mobile number that starts with 9, for example 912 345 6789.';

// How a saved number is SHOWN: a mobile number in any older spelling (0917 000 0000,
// +639170000000, ...) becomes "+63 917 000 0000". Anything that is not a Philippine
// mobile number (a landline, a foreign number) is shown exactly as it was saved.
export const displayPhone = (value) => {
    const digits = phoneDigits(value);

    return digits.length === PHONE_DIGITS ? toStoredPhone(digits) : String(value ?? '').trim();
};

// The number for a tel: link ("+639170000000"), or the saved text with the spaces removed.
export const phoneLink = (value) => {
    const digits = phoneDigits(value);

    return digits.length === PHONE_DIGITS ? `${PHONE_PREFIX}${digits}` : String(value ?? '').replace(/\s+/g, '');
};
