import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './authContext.js';

// Shown while access is being checked, or when it could not be verified.
const statusClass = 'px-5 py-10 text-center text-sm font-medium text-muted';

/*
 * Route guard: renders the nested routes only for a verified user with the
 * given role. This improves the experience only; Laravel's role middleware
 * is what actually protects admin data.
 */
function RequireRole({ role }) {
    const { status, user, retry } = useAuth();

    if (status === 'loading') {
        return <p className={statusClass}>Checking your access...</p>;
    }

    if (status === 'unauthenticated') {
        return (
            <Navigate
                to="/login"
                replace
                state={{ message: 'Please log in to continue.' }}
            />
        );
    }

    if (status === 'error') {
        return (
            <div className={statusClass} role="alert">
                <p>We could not verify your access. Please try again.</p>
                <button
                    type="button"
                    onClick={retry}
                    className="mt-3 cursor-pointer rounded-full border border-primary btn-glass px-5 py-2 [font-family:inherit] font-bold text-ink hover:bg-hover"
                >
                    Try again
                </button>
            </div>
        );
    }

    if (user?.role !== role) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}

export default RequireRole;
