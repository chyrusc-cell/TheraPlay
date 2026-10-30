import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { apiRequest, clearSession, getToken } from './api.js';
import { homeFor } from './authContext.js';

const statusClass = 'px-5 py-10 text-center text-sm font-medium text-muted';

/*
 * Guard for the pages only a logged-out person should see (login, register,
 * forgot password). It uses the same token as everything else and asks the server
 * (GET /api/user) before deciding:
 *  - no saved login: the page is shown at once;
 *  - a login the server accepts: the person is sent to their own dashboard
 *    (replacing this history entry, so Back never lands here again);
 *  - a login the server rejects (401): it is cleared and the page is shown;
 *  - the server cannot be reached: the page is shown and the login is kept
 *    (nobody is trapped on a loading screen, and nothing is cleared by mistake).
 * Nothing is rendered for the page while the answer is pending, so there is no
 * flash of the login form and no redirect back and forth.
 *
 * The password reset and email verification pages are NOT behind this guard: their
 * links must work whether or not someone happens to be logged in.
 */
function GuestOnly() {
    const [state, setState] = useState(() =>
        getToken() ? { status: 'checking' } : { status: 'guest' }
    );

    useEffect(() => {
        if (!getToken()) {
            return undefined;
        }

        const controller = new AbortController();

        const check = async () => {
            try {
                const result = await apiRequest('/user', { signal: controller.signal });

                if (result.status === 401) {
                    clearSession();
                    setState({ status: 'guest' });
                } else if (result.ok) {
                    setState({ status: 'authenticated', user: result.data });
                } else {
                    setState({ status: 'guest' });
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    setState({ status: 'guest' });
                }
            }
        };

        check();

        return () => controller.abort();
    }, []);

    if (state.status === 'checking') {
        return <p className={statusClass} role="status">Checking your session...</p>;
    }

    if (state.status === 'authenticated') {
        return <Navigate to={homeFor(state.user)} replace />;
    }

    return <Outlet />;
}

export default GuestOnly;
