import { useState, useEffect } from 'react';
import { AuthContext } from './authContext.js';
import { API_URL } from './api.js';

// The token is saved by Login.jsx in either localStorage or sessionStorage.
const getToken = () =>
    localStorage.getItem('theraplay_token') ||
    sessionStorage.getItem('theraplay_token');

/*
 * Verifies the logged-in user once with GET /api/user and shares the result,
 * so the route guard and the sidebar use the server's answer (not a role
 * saved in the browser). It lives inside Layout, so it loads once per visit
 * to the app and starts fresh after every login.
 */
function AuthProvider({ children }) {
    const [state, setState] = useState(() => ({
        status: getToken() ? 'loading' : 'unauthenticated',
        user: null,
    }));
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const token = getToken();

        if (!token) {
            return;
        }

        const controller = new AbortController();

        const verify = async () => {
            try {
                const response = await fetch(`${API_URL}/user`, {
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    signal: controller.signal,
                });

                if (response.status === 401) {
                    ['theraplay_token', 'theraplay_user'].forEach((key) => {
                        localStorage.removeItem(key);
                        sessionStorage.removeItem(key);
                    });
                    setState({ status: 'unauthenticated', user: null });
                    return;
                }

                if (!response.ok) {
                    throw new Error('Unable to verify the account.');
                }

                setState({ status: 'authenticated', user: await response.json() });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setState({ status: 'error', user: null });
                }
            }
        };

        verify();

        return () => controller.abort();
    }, [attempt]);

    const retry = () => {
        setState({ status: 'loading', user: null });
        setAttempt((n) => n + 1);
    };

    const updateUser = (patch) =>
        setState((current) =>
            current.user ? { ...current, user: { ...current.user, ...patch } } : current
        );

    return (
        <AuthContext.Provider value={{ ...state, retry, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthProvider;
