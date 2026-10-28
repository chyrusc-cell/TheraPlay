import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import * as auth from './authClasses.js';

function Login() {
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

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
                'http://127.0.0.1:8000/api/login',
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
            navigate(
                data.user?.role === 'admin'
                    ? '/professional-dashboard'
                    : '/dashboard'
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
        <div className={auth.pageBg} style={auth.backgroundStyle}>
            <div className={auth.panel}>
                <div className={auth.logoRowLeft}>
                    <div></div>
                    <h2 className={auth.logoTitleLogin}>TheraPlay!</h2>
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

                <div className={auth.divider}>
                    <span className={auth.dividerText}>Or login with</span>
                </div>

                <div className={auth.socialRow}>
                    <button
                        type="button"
                        className={auth.socialButton}
                        aria-label="Login with Facebook"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            width="20"
                            height="20"
                            fill="#1877F2"
                        >
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                    </button>

                    <button
                        type="button"
                        className={auth.socialButton}
                        aria-label="Login with Google"
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Login;