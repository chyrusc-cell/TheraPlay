// Tailwind class strings that are shared between a real component and its
// loading skeleton, so the placeholder always has the same shape as the
// content it stands in for. Keep full class names here (never build them from
// pieces) so Tailwind can find them.

// Breakpoints (laptop / tablet / tablet-sm / phone-lg / phone) are defined in
// css/tailwind.css.

// Public activities list.
export const activityGridClass =
    'grid grid-cols-3 gap-6 laptop:grid-cols-2 phone-lg:grid-cols-1';

// An activity card (and its loading skeleton): plain frosted glass with NO shadow
// (glow-card, css/tailwind.css). The 2px transparent border + inset variable keep
// the glass exactly as large as the old card-soft box (its 2px glass border sat
// outside the padding).
export const activityCardShell =
    'p-5 glow-card border-2 border-transparent [--glass-stack-inset:2px]';

// What the real card adds. Hover (devices that hover) or a keyboard-focused control
// inside it lights the animated glow of the sidebar links (the glow itself is in
// glow-card) and lifts the card 3px over the same 0.5s; with reduced motion there
// is no lift and the glow only fades (ui.css).
export const activityCardClass =
    `flex flex-col ${activityCardShell} transition-transform duration-500 ease-in-out hover:-translate-y-[3px] has-[:focus-visible]:-translate-y-[3px] motion-reduce:hover:translate-y-0 motion-reduce:has-[:focus-visible]:translate-y-0`;

// Contact Us: a white rounded container (Professional Contacts, Developer Team,
// Feedback) and the smaller card used for each professional inside the list.
export const contactPanelClass =
    'rounded-2xl border border-edge bg-white p-6 card-soft phone:p-4';

export const contactItemClass =
    'rounded-lg border border-edge card-soft p-4';

// Activity details: image column + text column.
export const detailsCardClass =
    'grid grid-cols-[280px_1fr] gap-[30px] rounded-2xl border border-edge bg-white card-soft p-[30px] tablet-sm:grid-cols-1 tablet-sm:p-5';

// ---------- Page layout (every page uses these, so headings sit in the same place) ----------
// The page content starts below the 56px top row. Same top padding everywhere, so
// the heading never jumps when you move between pages.

export const pageMain =
    'mx-auto w-full max-w-[1100px] px-5 pt-10 pb-20 phone:px-4 phone:pt-6 phone:pb-[60px]';

// Narrower pages made of forms (Profile).
export const pageMainNarrow =
    'mx-auto w-full max-w-[900px] px-5 pt-10 pb-20 phone:px-4 phone:pt-6 phone:pb-[60px]';

export const pageHeader = 'mb-8';
export const pageTitle =
    'text-[36px] leading-[1.2] font-bold text-ink phone:text-[28px]';
export const pageSubtitle = 'mt-2 text-[15px] font-medium text-muted';

// A small white glass action inside a card row (for example "Undo").
export const smallActionClass =
    'shrink-0 cursor-pointer rounded-xl border btn-glass btn-white px-3 py-1 [font-family:inherit] text-[12px] font-bold text-ink enabled:hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60';

// A value that is shown but cannot be edited (the email address of an account):
// darker than the editable fields, a not-allowed cursor, and still fully readable.
// Used together with the `disabled` attribute, so it cannot be focused, typed in
// or pasted into.
export const readOnlyFieldClass =
    'cursor-not-allowed bg-black/10! text-ink! opacity-100 disabled:opacity-100 border-edge';
