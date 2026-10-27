import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './authContext.js';

/*
 * Route guard: renders the nested routes only for a verified user with the
 * given role. This improves the experience only; Laravel's role middleware
 * is what actually protects admin data.
 */
function RequireRole({ role }) {
    const { status, user, retry } = useAuth();

    if (status === 'loading') {
        return <p className="access-status">Checking your access...</p>;
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
            <div className="access-status" role="alert">
                <p>We could not verify your access. Please try again.</p>
                <button type="button" onClick={retry}>Try again</button>
            </div>
        );
    }

    if (user?.role !== role) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
}

export default RequireRole;
