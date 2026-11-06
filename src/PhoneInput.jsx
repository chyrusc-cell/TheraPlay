import { formatPhoneDigits, phoneDigits, PHONE_PREFIX, toStoredPhone } from './phoneFormat.js';

/*
 * A Philippine mobile number field: a fixed "+63 |" on the left and the 10 digits
 * after it, grouped as they are typed ("912 345 6789"). The first digit must be 9
 * (a leading 0 is dropped), and no more than 10 digits are accepted; pasted numbers
 * such as "0912 345 6789" or "+63 912 345 6789" are tidied the same way.
 *
 * `value` and `onChange` use the SAVED form ("+63 912 345 6789", or '' when empty).
 * The parent supplies the field's look through `className` (the same input class as
 * its other fields); this component only adds room for the prefix.
 */
function PhoneInput({ id, value, onChange, className = '', ...rest }) {
    const digits = phoneDigits(value);

    return (
        <div className="relative">
            <span
                className="pointer-events-none absolute top-1/2 left-3.5 flex -translate-y-1/2 items-center gap-2 text-[15px] font-medium text-ink"
                aria-hidden="true"
            >
                {PHONE_PREFIX}
                <span className="h-5 w-px bg-edge-strong" />
            </span>

            <input
                {...rest}
                id={id}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="912 345 6789"
                value={formatPhoneDigits(digits)}
                onChange={(event) => onChange(toStoredPhone(phoneDigits(event.target.value)))}
                className={`${className} pl-[4.6rem]`}
            />
        </div>
    );
}

export default PhoneInput;
