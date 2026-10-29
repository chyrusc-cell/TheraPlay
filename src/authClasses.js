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

import background from '../img/occu_therapy.bg.jpg';

// The page photo is imported (not a CSS url) so Vite handles the asset path.
export const backgroundStyle = { backgroundImage: `url(${background})` };

// ---------- Page frames ----------

// Login and Forgot/Reset Password: photo background and a white side panel.
export const pageBg = 'flex min-h-screen bg-cover bg-center';

export const panel =
    'flex w-full max-w-[500px] flex-col justify-center rounded-r-[40px] bg-white px-20 py-[60px] shadow-[4px_0_20px_rgba(0,0,0,0.05)] phone:max-w-none phone:rounded-none phone:px-6 phone:py-10';

// Register: a centered white column.
export const registerPage =
    'flex min-h-screen items-center justify-center bg-white px-5 py-10 phone:px-4 phone:py-6';
export const registerContainer = 'flex w-full max-w-[600px] flex-col bg-white';

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
export const subtitle = 'text-[14px] font-normal text-[#888]';
export const subtitleLogin = 'text-[14px] font-normal text-muted';

export const backLink =
    'mb-5 flex items-center gap-1.5 text-[13px] font-medium text-[#666] no-underline transition-colors hover:text-[#333]';

// ---------- Form fields (floating label on the input's top border) ----------

export const field = 'relative mb-[30px] flex flex-col gap-2';
export const fieldInRow = 'relative mb-[30px] flex flex-1 flex-col gap-2';

export const label =
    'pointer-events-none absolute top-0 left-2.5 -translate-y-1/2 bg-white px-1 text-[12px] font-medium text-[#888]';

export const input =
    'w-full rounded-lg border border-[#ddd] px-3.5 py-3 [font-family:inherit] text-[15px] font-medium text-ink transition-[border-color] focus:border-[#333]';

export const inputRow = 'flex gap-5 phone:flex-col phone:gap-0';

export const showPassword =
    'absolute top-1/2 right-3.5 flex -translate-y-1/2 cursor-pointer items-center justify-center border-0 bg-transparent text-muted';

// ---------- Buttons ----------

export const loginButton =
    'mb-4 w-full cursor-pointer rounded-lg border-0 bg-primary p-3.5 [font-family:inherit] text-[16px] font-bold text-white enabled:hover:bg-primary-hover';

export const submitButton =
    'mb-10 w-full cursor-pointer rounded-lg border-0 bg-primary p-3.5 [font-family:inherit] text-[16px] font-bold text-white enabled:hover:bg-primary-hover';

export const registerButton =
    'mb-5 w-full cursor-pointer rounded border-0 bg-primary p-4 [font-family:inherit] text-[15px] font-bold text-white enabled:hover:bg-primary-hover';

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
export const rememberMe = 'flex cursor-pointer items-center gap-2 text-[#333]';
export const forgotLink = 'text-[#666] no-underline';

export const switchLinkLogin =
    'mb-[30px] text-center text-[13px] font-medium text-[#333]';
export const switchLinkRegister =
    'mb-[30px] text-center text-[13px] font-medium text-[#666]';
export const switchLinkAnchor = 'font-bold text-ink no-underline';

export const divider =
    `relative mb-6 text-center before:absolute before:top-1/2 before:right-0 before:left-0 before:z-[1] before:h-px before:bg-[#eee] before:content-['']`;
export const dividerText = 'relative z-[2] bg-white px-4 text-[12px] font-medium text-[#999]';

export const socialRow = 'flex gap-4';
export const socialButton =
    'flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-[#ddd] bg-white p-3 transition-colors hover:bg-[#f9f9f9]';

// ---------- Register: terms checkbox ----------

export const termsGroup = 'mb-6';
export const termsLabel =
    'flex cursor-pointer items-center gap-3 text-[13px] font-medium text-[#666]';
export const termsCheckbox =
    'h-[18px] w-[18px] cursor-pointer rounded-[4px] border-2 border-[#333]';
export const termsStrong = 'font-bold text-[#333]';
