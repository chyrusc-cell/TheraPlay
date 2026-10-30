import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './authContext.js';
import { getToken } from './api.js';

/*
 * Notices when the saved login disappears behind the page's back, and sends the
 * person to the login page instead of leaving a logged-in screen visible:
 *  - Back or Forward can restore a page from the browser's back/forward cache
 *    exactly as it was (its in-memory account data included) without running any
 *    code. The "pageshow" event reports that, and the page checks the login again.
 *  - Logging out in another tab removes the shared login ("storage" event).
 * Pages that do not need a login (guests) are left alone; the server still
 * checks the token on every request, this only removes the stale screen.
 * Renders nothing. It lives inside AuthProvider (see Layout).
 */
function SessionWatcher() {
    const { status } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (status !== 'authenticated') {
            return undefined;
        }

        const leaveIfLoggedOut = () => {
            if (!getToken()) {
                navigate('/login', {
                    replace: true,
                    state: { message: 'You have been logged out.' },
                });
            }
        };

        const handlePageShow = (event) => {
            // Only a restored page needs this check; a normal load already verified.
            if (event.persisted) {
                leaveIfLoggedOut();
            }
        };

        const handleStorage = (event) => {
            if (event.key === null || event.key === 'theraplay_token') {
                leaveIfLoggedOut();
            }
        };

        window.addEventListener('pageshow', handlePageShow);
        window.addEventListener('storage', handleStorage);

        return () => {
            window.removeEventListener('pageshow', handlePageShow);
            window.removeEventListener('storage', handleStorage);
        };
    }, [status, navigate]);

    return null;
}

export default SessionWatcher;
