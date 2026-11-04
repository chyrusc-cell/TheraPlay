import { Navigate } from 'react-router-dom';
import AuthProvider from './AuthProvider.jsx';
import { homeFor, useAuth } from './authContext.js';

const statusClass = 'px-5 py-10 text-center text-sm font-medium text-muted';

// Which account state belongs on which sign-up page.
const PAGE_FOR_STEP = { verify_email: '/verify-code', create_child: '/create-child' };

function Guard({ step, children }) {
    const { status, user, retry } = useAuth();

    if (status === 'loading') {
        return <p className={statusClass} role="status">Loading...</p>;
    }

    if (status === 'unauthenticated') {
        return <Navigate to="/login" replace state={{ message: 'Please log in to continue.' }} />;
    }

    if (status === 'error' || !user) {
        return (
            <p className={statusClass} role="alert">
                We could not check your account.{' '}
                <button type="button" className="cursor-pointer font-bold underline" onClick={retry}>
                    Try again
                </button>
            </p>
        );
    }

    // The account state decides where the person belongs (the server computed it:
    // user.onboarding); a page that does not match sends them to the right place.
    const target = homeFor(user);

    if (target !== PAGE_FOR_STEP[step]) {
        return <Navigate to={target} replace />;
    }

    return children;
}

/*
 * Guards a sign-up page (/verify-code, /create-child). A guest goes to login, an
 * admin to the admin dashboard, and a parent whose state is a different stage is
 * sent to that stage (an unverified parent to /verify-code, a verified parent
 * without a child to /create-child, a finished parent to the dashboard). This is
 * navigation only: the server enforces the same rules on its own.
 */
function OnboardingGate({ step, children }) {
    return (
        <AuthProvider>
            <Guard step={step}>{children}</Guard>
        </AuthProvider>
    );
}

export default OnboardingGate;
