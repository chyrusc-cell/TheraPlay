import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './authContext.js';
import EmailVerificationStatus from './EmailVerificationStatus.jsx';
import { pageMainNarrow, pageHeader, pageTitle, pageSubtitle } from './uiClasses.js';

/*
 * Renders the current page, except for an account that must verify its email
 * address first (the server says so with email_verification_required; see
 * EMAIL_VERIFICATION_ENFORCED_FROM in backend/.env). Such an account sees this
 * instruction instead, and can still open its Profile (to resend the email or
 * fix the address). The server holds the same account back on every API route,
 * so this is only the explanation, not the protection.
 */
function GatedOutlet() {
    const { user } = useAuth();
    const { pathname } = useLocation();

    const held = Boolean(user?.email_verification_required) && !pathname.startsWith('/profile');

    if (!held) {
        return <Outlet />;
    }

    return (
        <div className={pageMainNarrow}>
            <div className={pageHeader}>
                <h1 className={pageTitle}>Verify your email</h1>
                <p className={pageSubtitle}>
                    Please verify your email address to start using TheraPlay.
                </p>
            </div>

            <p className="mb-2 text-[15px] leading-[1.6] text-ink">
                We sent a verification link to <strong>{user.email}</strong>. Open it to
                continue. If it did not arrive, check your spam folder or ask for a new one.
            </p>

            <EmailVerificationStatus user={user} />

            <p className="mt-6 text-[14px] text-muted">
                Wrong address? Change it in your <Link to="/profile" className="font-bold text-ink underline">profile</Link>.
            </p>
        </div>
    );
}

export default GatedOutlet;
