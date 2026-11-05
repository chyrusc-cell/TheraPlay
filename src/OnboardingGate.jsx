import { Navigate } from 'react-router-dom';
import AuthProvider from './AuthProvider.jsx';
import { homeFor, isUnverifiedParent, useAuth } from './authContext.js';

const statusClass = 'px-5 py-10 text-center text-sm font-medium text-muted';

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
    if (step === 'verify_email') {
        // Open to any parent whose email is still unverified (they may come back to it
        // whenever they like); everyone else belongs elsewhere.
        return isUnverifiedParent(user) ? children : <Navigate to={homeFor(user)} replace />;
    }

    const target = homeFor(user);

    if (target !== '/create-child') {
        return <Navigate to={target} replace />;
    }

    return children;
}

/*
 * Guards a sign-up page (/verify-code, /create-child). A guest goes to login, an
 * admin to the admin dashboard, and a parent whose state is a different stage is
 * sent where they belong (an unverified parent may use /verify-code at any time;
 * a verified parent without a child is sent to /create-child, a finished parent to
 * the dashboard). This is
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
