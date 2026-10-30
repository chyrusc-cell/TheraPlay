// Tailwind class strings that are shared between a real component and its
// loading skeleton, so the placeholder always has the same shape as the
// content it stands in for. Keep full class names here (never build them from
// pieces) so Tailwind can find them.

// Breakpoints (laptop / tablet / tablet-sm / phone-lg / phone) are defined in
// css/tailwind.css.

// Public activities list.
export const activityGridClass =
    'grid grid-cols-3 gap-6 laptop:grid-cols-2 phone-lg:grid-cols-1';

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
