// Tailwind class strings shared by the three admin pages (Manage Activities,
// Manage Contacts, Manage Accounts), so they look and behave the same.
//
// Every string is written out in full (never built from pieces) so Tailwind can
// find the classes. Colors come from the design tokens in css/tailwind.css, and
// the focus ring is the global one from css/ui.css.
//
// Breakpoints: tablet / phone-lg (720) / phone (560) are named in
// css/tailwind.css.

// ---------- Page, header, messages ----------

export const page = 'min-h-page';

export const content =
    'mx-auto w-full max-w-[1100px] px-5 pt-10 pb-20 phone:px-4 phone:pt-6 phone:pb-[60px]';

export const header = 'mb-8 flex flex-wrap items-center justify-between gap-4';
export const title =
    'text-[36px] leading-[1.2] font-bold text-ink phone:text-[28px]';
export const subtitle = 'mt-2 text-[15px] font-medium text-muted';
export const headerActions = 'flex flex-wrap gap-2.5';

export const messageSuccess =
    'mb-5 animate-[ui-fade-in_0.2s_ease-out] text-[14px] text-[#188038]';
export const messageError =
    'mb-5 animate-[ui-fade-in_0.2s_ease-out] text-[14px] text-[#d93025]';

// Error block with a retry button (the button gets its top margin here).
export const listError =
    'p-[30px] text-center text-[14px] text-[#d93025] [&_button]:mt-3';

// ---------- Buttons ----------

export const addButton =
    'cursor-pointer rounded-full border-0 bg-primary px-[18px] py-[11px] text-[14px] text-white enabled:hover:bg-primary-hover btn-solid';

export const saveButton =
    'cursor-pointer rounded-full border-0 bg-primary px-[18px] py-2.5 text-[14px] text-white enabled:hover:bg-primary-hover btn-solid';

export const cancelButton =
    'cursor-pointer rounded-full border border-edge-strong btn-glass px-[18px] py-2.5 text-[14px] text-ink enabled:hover:bg-hover';

// Small buttons inside table rows and file lists.
export const editButton =
    'cursor-pointer rounded-full border border-edge-strong btn-glass px-[11px] py-[7px] text-[12px] text-ink enabled:hover:bg-hover phone-lg:min-h-9';

// Delete is red. The label always says "Delete" as well.
export const deleteButton =
    'cursor-pointer rounded-full border border-danger bg-white/70 btn-tone [--tp-ring:rgba(197,34,31,0.38)] px-[11px] py-[7px] text-[12px] text-danger-text enabled:hover:bg-danger-bg-hover phone-lg:min-h-9';

// Publish is green, Unpublish is amber: distinct from each other and from Delete.
export const publishButton =
    'cursor-pointer rounded-full border border-success bg-success-bg/70 btn-tone [--tp-ring:rgba(21,115,47,0.38)] px-[11px] py-[7px] text-[12px] text-success-text enabled:hover:bg-success-bg-hover phone-lg:min-h-9';

export const unpublishButton =
    'cursor-pointer rounded-full border border-warning-border bg-warning-bg/70 btn-tone [--tp-ring:rgba(180,120,0,0.42)] px-[11px] py-[7px] text-[12px] text-warning-text enabled:hover:bg-warning-bg-hover phone-lg:min-h-9';

// A neutral row button (for example "Make Admin" / "Make Parent").
export const neutralRowButton =
    'cursor-pointer rounded-full border border-edge-strong bg-warm/70 btn-tone px-[11px] py-[7px] text-[12px] text-ink enabled:hover:bg-hover phone-lg:min-h-9';

// ---------- Form ----------

export const formCard =
    'mb-[25px] animate-[ui-rise-in_0.25s_ease-out] rounded-[10px] border border-edge bg-white card-soft p-[25px] phone:p-4';

export const formTitle = 'mb-5 text-[20px] font-bold';
export const formGroup = 'mb-[18px] flex flex-col';
export const label = 'mb-[7px] text-[14px] font-bold';

export const input =
    'rounded-xl border border-edge-strong p-[11px] text-[14px]';

export const textarea =
    'resize-y rounded-xl border border-edge-strong p-[11px] [font-family:inherit] text-[14px]';

export const fieldError = 'mt-1.5 text-[13px] text-[#d93025]';

// Save / Cancel row. On phones the buttons stack and fill the width.
export const formActions =
    'mt-5 flex gap-2.5 phone:flex-col phone:[&>button]:w-full';

// ---------- Table ----------
//
// On desktop: a normal table. Below 720px every row becomes a small card: each
// cell shows its column name (from its data-label attribute) next to its value,
// so no data or action is hidden and nothing needs sideways scrolling. The real
// header stays available to screen readers (sr-only).

export const tableContainer =
    'overflow-hidden rounded-[10px] border border-edge bg-white card-soft';

export const table = 'w-full border-collapse phone-lg:block';
export const thead = 'phone-lg:sr-only';
export const tbody = 'phone-lg:block';

export const th =
    'border-b border-edge bg-white p-4 text-left text-[13px] font-bold';

// A data row. The last row has no bottom line on desktop (its cells) and none
// on phones (the row itself).
export const row =
    'transition-colors hover:bg-warm [&:last-child>td]:border-b-0 phone-lg:block phone-lg:border-b phone-lg:border-edge phone-lg:py-2 phone-lg:last:border-b-0';

export const td =
    'border-b border-edge p-4 text-left text-[14px] phone-lg:flex phone-lg:items-start phone-lg:justify-between phone-lg:gap-3 phone-lg:border-b-0 phone-lg:px-4 phone-lg:py-2 phone-lg:text-right phone-lg:[word-break:break-word] phone-lg:before:shrink-0 phone-lg:before:text-left phone-lg:before:text-[12px] phone-lg:before:font-bold phone-lg:before:text-muted phone-lg:before:content-[attr(data-label)]';

// The "nothing here yet" cell has no column label.
export const tdEmpty =
    'border-b border-edge p-4 text-left text-[14px] phone-lg:block phone-lg:border-b-0';

export const actions = 'flex flex-wrap gap-2 phone-lg:justify-end';

// ---------- Table cell details ----------

export const cellSub = 'mt-1 text-[12px] leading-[1.4] text-faint';
export const confirmText = 'self-center text-[12px] text-[#d93025]';

// Status and role badges (difficulty badges live in uiHelpers.js).
const badge = 'inline-block rounded-md px-2.5 py-1 text-xs font-bold leading-[1.3]';

export const badgePublished = `${badge} bg-success-bg text-success`;
export const badgeDraft = `${badge} bg-white text-muted`;
export const badgeAdmin = `${badge} bg-accent-soft text-accent-hover`;
export const badgeParent = `${badge} bg-white text-muted`;

export const youTag =
    'ml-2 rounded-[10px] bg-white px-[7px] py-0.5 text-[11px] font-bold text-muted';

// ---------- Uploaded files in the activity form ----------

export const fileHint = 'mb-2 text-[12px] leading-[1.4] text-faint';
export const fileList = 'mb-2.5 list-none';

export const fileItem =
    'mb-1.5 flex items-center justify-between gap-2.5 rounded-md border border-edge card-soft px-2.5 py-2 text-[13px] phone:flex-wrap';

export const fileName = '[word-break:break-word]';
export const fileSize = 'text-faint';
export const fileActions = 'flex flex-wrap items-center gap-2';

export const fileRemove =
    'shrink-0 cursor-pointer rounded-full border border-edge-strong btn-glass px-2.5 py-[5px] text-[12px] text-ink enabled:hover:bg-hover phone-lg:min-h-9';

// ---------- Activity form layout (Manage Activities) ----------

// Two columns on desktop; one column from the tablet breakpoint down.
export const activityFormGrid =
    'grid grid-cols-2 gap-x-8 tablet:grid-cols-1';

// Fixed height (set per field) with no manual resizing; long text scrolls
// inside the box instead of growing the form.
export const activityTextarea =
    'min-h-14 max-h-32 w-full resize-none overflow-y-auto rounded-xl border border-edge-strong p-[11px] [font-family:inherit] text-[14px]';

// Category + Difficulty side by side; stacked on phones.
export const activityPairRow = 'grid grid-cols-2 gap-3 phone:grid-cols-1';

// The picture area. Pictures are not uploadable yet, so this is a placeholder.
export const activityPicture =
    'flex h-52 items-center justify-center rounded-[10px] border border-dashed border-edge-strong bg-white px-4 text-center text-[13px] leading-[1.5] text-faint';

// Cancel then the primary action, right-aligned. On phones they stack, with
// the primary action on top, full width.
export const activityFormActions =
    'sticky bottom-0 z-10 -mx-6 -mb-6 mt-4 flex justify-end gap-2.5 border-t border-white/30 bg-white/50 backdrop-blur-[35px] px-6 py-4 phone:-mx-4 phone:-mb-4 phone:flex-col-reverse phone:px-4 phone:[&>button]:w-full';

// ---------- Contact form layout (Manage Contacts) ----------

// Picture on the left, details on the right; one column on tablets and down.
export const contactFormGrid =
    'grid grid-cols-[0.8fr_1.6fr] gap-x-8 gap-y-2 tablet:grid-cols-1';

// The large circular picture selector (a button, so it works with the keyboard).
export const avatarCircle =
    'flex h-44 w-44 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-edge-strong bg-white p-0 text-faint enabled:hover:bg-hover phone:h-36 phone:w-36';

// The clickable picture box in the activity form (shows the picture, or a prompt).
export const activityPictureButton =
    'flex h-52 w-full cursor-pointer items-center justify-center overflow-hidden rounded-[10px] border border-dashed border-edge-strong bg-white p-0 text-center text-[13px] leading-[1.5] text-faint enabled:hover:bg-hover';
