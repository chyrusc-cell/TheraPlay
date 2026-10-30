// Tailwind class strings shared by the sign-in pages: Login, Register, Forgot
// Password and Reset Password.
//
// These reproduce what the pages ACTUALLY looked like. The old stylesheets
// were global and overlapped (for example every page's input styling was the
// result of the Login, Register, Forgot Password and Profile rules merged
// together), so the values here are the merged result, not any single file.
//
// Every string is written out in full so Tailwind can find the classes. The
// focus ring on fields and buttons is the global one from css/ui.css.

// The page background is the site-wide gradient (css/ui.css, body::before), so
// the sign-in pages set none of their own.

// ---------- Page frames ----------

// Login and Forgot/Reset Password: a white side panel over the gradient.
export const pageBg = 'flex min-h-screen';

export const panel =
    'flex w-full max-w-[500px] flex-col justify-center rounded-r-[40px] bg-white px-20 py-[60px] shadow-[4px_0_20px_rgba(0,0,0,0.05)] phone:max-w-none phone:rounded-none phone:px-6 phone:py-10';

// Register: a centered white column.
export const registerPage =
    'flex min-h-screen items-center justify-center px-5 py-10 phone:px-4 phone:py-6';
export const registerContainer =
    'flex w-full max-w-[600px] flex-col rounded-[28px] border border-white/70 bg-white/85 px-10 py-10 card-soft backdrop-blur-[12px] phone:rounded-3xl phone:px-5 phone:py-6';

// ---------- Headings ----------

export const logoRow = 'mb-[60px] flex items-center justify-center gap-2.5';
export const logoRowLeft = 'mb-[60px] flex items-center gap-2.5';
export const logoImage = 'block h-11 w-auto';
export const logoTitle = 'text-[24px] font-bold text-ink';
export const logoTitleLogin = 'text-[24px] font-bold';

export const headerText = 'mb-10';
export const headerTextLogin = 'mb-[30px]';
export const headerTitle = 'mb-3 text-[32px] font-bold text-ink';
export const headerTitleLogin = 'mb-2 text-[32px] font-bold text-ink';
export const subtitle = 'text-[14px] font-normal text-faint';
export const subtitleLogin = 'text-[14px] font-normal text-muted';

export const backLink =
    'mb-5 flex items-center gap-1.5 text-[13px] font-medium text-muted no-underline transition-colors hover:text-ink';

// ---------- Form fields (floating label on the input's top border) ----------

export const field = 'relative mb-[30px] flex flex-col gap-2';
export const fieldInRow = 'relative mb-[30px] flex flex-1 flex-col gap-2';

export const label =
    'pointer-events-none absolute top-0 left-2.5 -translate-y-1/2 bg-white px-1 text-[12px] font-medium text-faint';

export const input =
    'w-full rounded-xl border border-edge-strong px-3.5 py-3 [font-family:inherit] text-[15px] font-medium text-ink transition-[border-color] focus:border-accent';

export const inputRow = 'flex gap-5 phone:flex-col phone:gap-0';

export const showPassword =
    'absolute top-1/2 right-3.5 flex -translate-y-1/2 cursor-pointer items-center justify-center border-0 bg-transparent text-muted';

// ---------- Buttons ----------

export const loginButton =
    'mb-4 w-full cursor-pointer rounded-full border-0 bg-primary p-3.5 [font-family:inherit] text-[16px] font-bold text-white enabled:hover:bg-primary-hover btn-solid';

export const submitButton =
    'mb-10 w-full cursor-pointer rounded-full border-0 bg-primary p-3.5 [font-family:inherit] text-[16px] font-bold text-white enabled:hover:bg-primary-hover btn-solid';

export const registerButton =
    'mb-5 w-full cursor-pointer rounded border-0 bg-primary p-4 [font-family:inherit] text-[15px] font-bold text-white enabled:hover:bg-primary-hover btn-solid';

// ---------- Messages ----------

export const messageError = 'mb-4 text-[14px] text-[#d93025]';
export const messageSuccess = 'mb-4 text-[14px] text-[#188038]';
export const messageWarning = 'mb-4 text-[14px] text-[#b26a00]';

// Register shows its message with a different vertical margin.
export const registerMessageError = 'my-3 text-[14px] text-[#d93025]';
export const registerMessageSuccess = 'my-3 text-[14px] text-[#188038]';

// ---------- Login options, links and the social sign-in row ----------

export const loginOptions =
    'mb-6 flex items-center justify-between text-[13px] font-medium';
export const rememberMe = 'flex cursor-pointer items-center gap-2 text-ink';
export const forgotLink = 'text-muted no-underline';

export const switchLinkLogin =
    'mb-[30px] text-center text-[13px] font-medium text-ink';
export const switchLinkRegister =
    'mb-[30px] text-center text-[13px] font-medium text-muted';
export const switchLinkAnchor = 'font-bold text-ink no-underline';

// ---------- Register: terms checkbox ----------

export const termsGroup = 'mb-6';
export const termsLabel =
    'flex cursor-pointer items-center gap-3 text-[13px] font-medium text-muted';
export const termsCheckbox =
    'h-[18px] w-[18px] cursor-pointer rounded-[4px] border-2 border-accent';
export const termsStrong = 'font-bold text-ink';
