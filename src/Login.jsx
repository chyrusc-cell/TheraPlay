import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import * as auth from './authClasses.js';
import { logo } from './brand.js';
import { API_URL } from './api.js';

function Login() {
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    // On by default, so a refresh or a closed browser does not log people out. Untick
    // it on a shared computer: the login then lasts only for this browser tab.
    const [rememberMe, setRememberMe] = useState(true);

    const location = useLocation();
    const [message, setMessage] = useState(location.state?.message || '');
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const handleLogin = async (event) => {
        event.preventDefault();

        setMessage('');
        setIsError(false);
        setIsLoading(true);

        try {
            const response = await fetch(
                `${API_URL}/login`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    body: JSON.stringify({
                        email: email.trim(),
                        password,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || 'Unable to log in. Please try again.'
                );
            }

            // Store the token according to the Remember me choice.
            const storage = rememberMe ? localStorage : sessionStorage;

            // Clear an older token from the other storage.
            const otherStorage = rememberMe ? sessionStorage : localStorage;
            otherStorage.removeItem('theraplay_token');
            otherStorage.removeItem('theraplay_user');

            storage.setItem('theraplay_token', data.token);
            storage.setItem('theraplay_user', JSON.stringify(data.user));

            // Redirect after successful authentication. The role is only used
            // to pick the landing page; the admin pages verify it again.
            // (Replacing the login page in the history, so Back does not return to it.)
            navigate(
                data.user?.role === 'admin'
                    ? '/professional-dashboard'
                    : '/dashboard',
                { replace: true }
            );
        } catch (error) {
            setMessage(
                error.message ||
                'Unable to connect to the server. Please try again.'
            );
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className={auth.pageBg}>
            <div className={auth.panel}>
                <div className={auth.logoRowLeft}>
                    <img src={logo} alt="TheraPlay" className={auth.logoImage} />
                </div>

                <div className={auth.headerTextLogin}>
                    <h1 className={auth.headerTitleLogin}>Login</h1>
                    <p className={auth.subtitleLogin}>
                        Login to access your TheraPlay account
                    </p>
                </div>

                <form onSubmit={handleLogin}>
                    <div className={auth.field}>
                        <input className={auth.input}
                            type="email"
                            id="email"
                            placeholder=" "
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                        />
                        <label className={auth.label} htmlFor="email">Email</label>
                    </div>

                    <div className={auth.field}>
                        <input className={auth.input}
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            placeholder=" "
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />
                        <label className={auth.label} htmlFor="password">Password</label>

                        <button
                            type="button"
                            className={auth.showPassword}
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label="Toggle password visibility"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                stroke="currentColor"
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                {showPassword ? (
                                    <>
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </>
                                ) : (
                                    <>
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8s-4 8-11 8a10.05 10.05 0 0 1-5.94-2.06" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </>
                                )}
                            </svg>
                        </button>
                    </div>

                    <div className={auth.loginOptions}>
                        <label className={auth.rememberMe}>
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(event) =>
                                    setRememberMe(event.target.checked)
                                }
                            />
                            Remember me
                        </label>

                        <Link
                            to="/forgot-password"
                            className={auth.forgotLink}
                        >
                            Forgot Password
                        </Link>
                    </div>

                    {message && (
                        <p
                            role="alert"
                            className={isError ? auth.messageError : auth.messageSuccess}
                        >
                            {message}
                        </p>
                    )}

                    <button
                        type="submit"
                        className={auth.loginButton}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <p className={auth.switchLinkLogin}>
                    Don't have an account?{' '}
                    <Link to="/register" className={auth.switchLinkAnchor}>Sign up</Link>
                </p>

            </div>
        </main>
    );
}

export default Login;