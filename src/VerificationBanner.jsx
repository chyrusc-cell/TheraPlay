import { Link, useLocation } from 'react-router-dom';
import { VERIFY_CODE_PATH, isUnverifiedParent, useAuth } from './authContext.js';

/*
 * A calm, persistent reminder for a parent whose email address is not verified yet.
 * It is a normal part of the page (no popup, nothing to dismiss repeatedly), shown
 * at the top of every page inside the app layout, and links to the code screen where
 * the code can be entered or a new one requested. What an unverified parent may do
 * is decided by the server; this banner only explains it.
 */
function VerificationBanner() {
    const { user } = useAuth();
    const { pathname } = useLocation();

    if (!isUnverifiedParent(user)) {
        return null;
    }

    return (
        <div className="mx-auto w-full max-w-[1100px] px-5 pt-4 phone:px-4">
            <div
                role="region"
                aria-label="Email verification reminder"
                data-testid="verification-banner"
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-edge-strong card-soft px-4 py-3"
            >
                <p className="min-w-0 flex-1 basis-[260px] text-[14px] leading-[1.5] text-ink">
                    <strong>Your email address is not verified.</strong> You can browse
                    TheraPlay, but adding a child profile, completing activities and saving
                    notes stay locked until you verify {user.email}.
                </p>

                <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                        to={VERIFY_CODE_PATH}
                        className="cursor-pointer rounded-xl px-4 py-1.5 text-[13px] font-bold text-ink no-underline btn-glass btn-green"
                    >
                        Verify now
                    </Link>

                    {pathname !== '/profile' && (
                        <Link
                            to="/profile"
                            className="cursor-pointer rounded-xl px-4 py-1.5 text-[13px] font-bold text-ink no-underline btn-glass btn-white"
                        >
                            Change email
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}

export default VerificationBanner;
