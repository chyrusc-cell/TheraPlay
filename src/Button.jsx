import { LoaderCircle } from 'lucide-react';

/*
 * The shared button. It is one <button> element (never a wrapper around another
 * button) with the glass 3D look from btn-solid / btn-glass in css/tailwind.css,
 * so a Button looks exactly like the buttons built directly from those classes.
 *
 *   <Button variant="primary" size="medium" type="submit" loading={saving}>
 *       Save Changes
 *   </Button>
 *
 *  - variant: primary (accent), secondary (subtle glass, the default), danger
 *    (destructive, solid), success (green, solid), ghost (light, no surface).
 *  - size: small, medium (default) or large.
 *  - type: "button" by default, so a Button inside a form never submits it by
 *    accident; pass type="submit" for the submit button.
 *  - loading: disables the button, marks it aria-busy and shows a spinner next to
 *    the children. Say what is happening in the children ("Saving...").
 *  - className is appended; every other prop (onClick, aria-*, title, ref, ...)
 *    goes to the <button>. Icons are ordinary children.
 */
const variants = {
    primary:
        'border-0 bg-primary text-white enabled:hover:bg-primary-hover btn-solid',
    secondary:
        'border border-edge-strong text-ink enabled:hover:bg-hover btn-glass',
    danger:
        'border-0 bg-[#a50e0e] text-white enabled:hover:bg-[#8b0b0b] [--btn-glow:139,11,11] btn-solid',
    success:
        'border-0 bg-success text-white enabled:hover:bg-[#0f5c25] [--btn-glow:21,115,47] btn-solid',
    ghost:
        'border border-transparent bg-transparent text-ink enabled:hover:bg-hover',
};

const sizes = {
    small: 'px-4 py-1.5 text-[13px]',
    medium: 'px-[22px] py-2.5 text-[14px]',
    large: 'px-8 py-3.5 text-[16px]',
};

const base =
    'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full [font-family:inherit] font-bold disabled:cursor-not-allowed disabled:opacity-60';

function Button({
    variant = 'secondary',
    size = 'medium',
    type = 'button',
    loading = false,
    disabled = false,
    className = '',
    children,
    ...rest
}) {
    return (
        <button
            type={type}
            className={`${base} ${variants[variant] || variants.secondary} ${sizes[size] || sizes.medium} ${className}`.trim()}
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
            {children}
        </button>
    );
}

export default Button;
