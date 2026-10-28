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

export const page = 'min-h-page bg-[#f5f7fa]';

export const content =
    'mx-auto max-w-[1100px] px-[30px] py-[50px] phone:px-4 phone:py-[30px]';

export const header = 'mb-[30px] flex flex-wrap items-center justify-between gap-4';
export const title = 'mb-2 text-[32px] font-bold';
export const subtitle = 'text-[#666]';
export const headerActions = 'flex flex-wrap gap-2.5';

export const messageSuccess = 'mb-5 text-[14px] text-[#188038]';
export const messageError = 'mb-5 text-[14px] text-[#d93025]';

// Error block with a retry button (the button gets its top margin here).
export const listError =
    'p-[30px] text-center text-[14px] text-[#d93025] [&_button]:mt-3';

// ---------- Buttons ----------

export const addButton =
    'cursor-pointer rounded-md border-0 bg-primary px-[18px] py-[11px] text-[14px] text-white enabled:hover:bg-primary-hover';

export const saveButton =
    'cursor-pointer rounded-md border-0 bg-primary px-[18px] py-2.5 text-[14px] text-white enabled:hover:bg-primary-hover';

export const cancelButton =
    'cursor-pointer rounded-md border border-[#ccc] bg-white px-[18px] py-2.5 text-[14px] text-[#333] enabled:hover:bg-hover';

// Small buttons inside table rows and file lists.
export const editButton =
    'cursor-pointer rounded-[5px] border border-[#ccc] bg-white px-[11px] py-[7px] text-[12px] text-[#333] enabled:hover:bg-hover phone-lg:min-h-9';

// Delete is red. The label always says "Delete" as well.
export const deleteButton =
    'cursor-pointer rounded-[5px] border border-danger bg-white px-[11px] py-[7px] text-[12px] text-danger-text enabled:hover:bg-danger-bg-hover phone-lg:min-h-9';

// Publish is green, Unpublish is amber: distinct from each other and from Delete.
export const publishButton =
    'cursor-pointer rounded-[5px] border border-success bg-success-bg px-[11px] py-[7px] text-[12px] text-success-text enabled:hover:bg-success-bg-hover phone-lg:min-h-9';

export const unpublishButton =
    'cursor-pointer rounded-[5px] border border-warning-border bg-warning-bg px-[11px] py-[7px] text-[12px] text-warning-text enabled:hover:bg-warning-bg-hover phone-lg:min-h-9';

// A neutral row button (for example "Make Admin" / "Make Parent").
export const neutralRowButton =
    'cursor-pointer rounded-[5px] border border-[#ddd] bg-[#f5f5f5] px-[11px] py-[7px] text-[12px] text-[#333] enabled:hover:bg-hover phone-lg:min-h-9';

// ---------- Form ----------

export const formCard =
    'mb-[25px] rounded-[10px] border border-[#e1e5ea] bg-white p-[25px] phone:p-4';

export const formTitle = 'mb-5 text-[20px] font-bold';
export const formGroup = 'mb-[18px] flex flex-col';
export const label = 'mb-[7px] text-[14px] font-bold';

export const input =
    'rounded-md border border-[#ccc] p-[11px] text-[14px]';

export const textarea =
    'resize-y rounded-md border border-[#ccc] p-[11px] [font-family:inherit] text-[14px]';

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
    'overflow-hidden rounded-[10px] border border-[#e1e5ea] bg-white';

export const table = 'w-full border-collapse phone-lg:block';
export const thead = 'phone-lg:sr-only';
export const tbody = 'phone-lg:block';

export const th =
    'border-b border-[#e5e5e5] bg-hover p-4 text-left text-[13px] font-bold';

// A data row. The last row has no bottom line on desktop (its cells) and none
// on phones (the row itself).
export const row =
    'transition-colors hover:bg-[#fafbfc] [&:last-child>td]:border-b-0 phone-lg:block phone-lg:border-b phone-lg:border-[#e5e5e5] phone-lg:py-2 phone-lg:last:border-b-0';

export const td =
    'border-b border-[#e5e5e5] p-4 text-left text-[14px] phone-lg:flex phone-lg:items-start phone-lg:justify-between phone-lg:gap-3 phone-lg:border-b-0 phone-lg:px-4 phone-lg:py-2 phone-lg:text-right phone-lg:[word-break:break-word] phone-lg:before:shrink-0 phone-lg:before:text-left phone-lg:before:text-[12px] phone-lg:before:font-bold phone-lg:before:text-[#666] phone-lg:before:content-[attr(data-label)]';

// The "nothing here yet" cell has no column label.
export const tdEmpty =
    'border-b border-[#e5e5e5] p-4 text-left text-[14px] phone-lg:block phone-lg:border-b-0';

export const actions = 'flex flex-wrap gap-2 phone-lg:justify-end';

// ---------- Table cell details ----------

export const cellSub = 'mt-1 text-[12px] leading-[1.4] text-[#888]';
export const confirmText = 'self-center text-[12px] text-[#d93025]';

// Status and role badges (difficulty badges live in uiHelpers.js).
const badge = 'inline-block rounded-md px-2.5 py-1 text-xs font-bold leading-[1.3]';

export const badgePublished = `${badge} bg-success-bg text-success`;
export const badgeDraft = `${badge} bg-hover text-muted`;
export const badgeAdmin = `${badge} bg-[#e8eaf6] text-[#3f4a8a]`;
export const badgeParent = `${badge} bg-hover text-muted`;

export const youTag =
    'ml-2 rounded-[10px] bg-hover px-[7px] py-0.5 text-[11px] font-bold text-muted';

// ---------- Uploaded files in the activity form ----------

export const fileHint = 'mb-2 text-[12px] leading-[1.4] text-[#888]';
export const fileList = 'mb-2.5 list-none';

export const fileItem =
    'mb-1.5 flex items-center justify-between gap-2.5 rounded-md border border-[#e5e5e5] bg-[#f8f9fa] px-2.5 py-2 text-[13px] phone:flex-wrap';

export const fileName = '[word-break:break-word]';
export const fileSize = 'text-[#888]';
export const fileActions = 'flex flex-wrap items-center gap-2';

export const fileRemove =
    'shrink-0 cursor-pointer rounded-[5px] border border-[#ddd] bg-white px-2.5 py-[5px] text-[12px] text-[#333] enabled:hover:bg-hover phone-lg:min-h-9';
