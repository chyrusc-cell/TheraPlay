import { LoaderCircle } from 'lucide-react';

/*
 * The shared button. It is one <button> element (never a wrapper around another
 * button) with the neutral glass 3D look of btn-glass (css/tailwind.css, palette
 * tokens --btn-* in css/ui.css): an 80% white surface, dark gray text, a gray edge
 * ring, a sheen and layered shadows. Every button of the app looks like this, so
 * a Button looks exactly like the buttons built directly from the btn-glass class
 * (adminClasses, authClasses and the page-level pill classes).
 *
 *   <Button size="medium" type="submit" loading={saving} icon={<Plus size={16} />}>
 *       Save Changes
 *   </Button>
 *
 *  - size: small, medium (default) or large.
 *  - icon: an optional leading icon element (marked aria-hidden for you).
 *  - fullWidth: stretches the button to its container.
 *  - type: "button" by default, so a Button inside a form never submits it by
 *    accident; pass type="submit" for the submit button.
 *  - loading: disables the button, marks it aria-busy and shows a spinner next to
 *    the children. Say what is happening in the children ("Saving...").
 *  - variant: the same glass look in a different hue: primary and secondary
 *    are white (there are no blue or gray buttons), danger red, success green. "ghost" has no surface, for low-emphasis
 *    text actions.
 *  - className is appended; every other prop (onClick, aria-*, title, ref, ...)
 *    goes to the <button>.
 */
const sizes = {
    small: 'px-4 py-1.5 text-[13px]',
    medium: 'px-[22px] py-2.5 text-[14px]',
    large: 'px-8 py-3.5 text-[16px]',
};

const base =
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl [font-family:inherit] font-bold disabled:cursor-not-allowed disabled:opacity-60';

// Color only: the look is always btn-glass, the variant picks its hue (ui.css).
const tones = {
    primary: 'btn-white',
    secondary: 'btn-white',
    danger: 'btn-red',
    success: 'btn-green',
};

const ghost =
    'border border-transparent bg-transparent text-ink enabled:hover:bg-hover';

function Button({
    variant = 'secondary',
    size = 'medium',
    type = 'button',
    loading = false,
    disabled = false,
    fullWidth = false,
    icon = null,
    className = '',
    children,
    ...rest
}) {
    const look = variant === 'ghost' ? ghost : `btn-glass ${tones[variant] || tones.secondary}`;

    return (
        <button
            type={type}
            className={`${base} ${look} ${sizes[size] || sizes.medium} ${fullWidth ? 'w-full' : ''} ${className}`.replace(/\s+/g, ' ').trim()}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            {...rest}
        >
            {loading && (
                <LoaderCircle
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 motion-safe:animate-spin"
                />
            )}
            {!loading && icon && (
                <span aria-hidden="true" className="inline-flex shrink-0">
                    {icon}
                </span>
            )}
            {children}
        </button>
    );
}

export default Button;
