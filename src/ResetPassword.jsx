import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest, mapValidationErrors } from './api.js';
import * as auth from './authClasses.js';
import { logo } from './brand.js';

// Opened from the link in the password reset email:
//   /reset-password?token=...&email=...
// The token only comes from that link. The server checks it, decides whether
// it is valid, and applies the new password.
function ResetPassword() {
    const navigate = useNavigate();
    const [params] = useSearchParams();

    const token = params.get('token') || '';
    const email = params.get('email') || '';

    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [fieldError, setFieldError] = useState('');
    const [message, setMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const linkIsIncomplete = !token || !email;

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (isSaving) {
            return;
        }

        // Quick feedback only; the server repeats these checks.
        if (password.length < 8) {
            setFieldError('The password must be at least 8 characters.');
            return;
        }

        if (password !== passwordConfirmation) {
            setFieldError('The password confirmation does not match.');
            return;
        }

        setIsSaving(true);
        setFieldError('');
        setMessage('');

        try {
            const result = await apiRequest('/reset-password', {
                method: 'POST',
                auth: false,
                body: {
                    token,
                    email,
                    password,
                    password_confirmation: passwordConfirmation,
                },
            });

            if (result.status === 429) {
                setMessage('Too many attempts. Please wait a minute and try again.');
                return;
            }

            if (result.status === 422 && result.data.errors) {
                const errors = mapValidationErrors(result.data.errors);

                // Problems with the token or email are about the link itself.
                if (errors.token || errors.email) {
                    setMessage(
                        'This password reset link is invalid or has expired. Please request a new one.'
                    );
                } else {
                    setFieldError(errors.password || 'Please check the new password.');
                }

                return;
            }

            if (!result.ok) {
                setMessage(
                    result.data.message ||
                    'Unable to reset the password. Please try again.'
                );
                return;
            }

            // Replace this page in the history so the token is not left behind.
            navigate('/login', {
                replace: true,
                state: {
                    message: 'Your password has been reset. Please log in with your new password.',
                },
            });
        } catch {
            setMessage('Unable to connect to the server. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className={auth.pageBg}>
            <div className={auth.panel}>

                <div className={auth.logoRow}>
                    <img src={logo} alt="TheraPlay" className={auth.logoImage} />
                </div>

                <Link to="/login" className={auth.backLink}>
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                    Back to login
                </Link>

                <div className={auth.headerText}>
                    <h1 className={auth.headerTitle}>Choose a new password</h1>
                    <p className={auth.subtitle}>
                        {linkIsIncomplete
                            ? 'This reset link is incomplete.'
                            : `Resetting the password for ${email}`}
                    </p>
                </div>

                {linkIsIncomplete ? (

                    <p
                        role="alert"
                        className={auth.messageError}
                    >
                        Please open the link from your password reset email, or
                        request a new link from your Profile page.
                    </p>

                ) : (

                    <form onSubmit={handleSubmit}>
                        <div className={auth.field}>
                            <input className={auth.input}
                                type="password"
                                id="new-password"
                                placeholder=" "
                                autoComplete="new-password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                disabled={isSaving}
                                required
                            />
                            <label className={auth.label} htmlFor="new-password">New password</label>
                        </div>

                        <div className={auth.field}>
                            <input className={auth.input}
                                type="password"
                                id="confirm-password"
                                placeholder=" "
                                autoComplete="new-password"
                                value={passwordConfirmation}
                                onChange={(event) => setPasswordConfirmation(event.target.value)}
                                disabled={isSaving}
                                required
                            />
                            <label className={auth.label} htmlFor="confirm-password">Confirm new password</label>
                        </div>

                        {fieldError && (
                            <p
                                role="alert"
                                className={auth.messageError}
                            >
                                {fieldError}
                            </p>
                        )}

                        {message && (
                            <p
                                role="alert"
                                className={auth.messageError}
                            >
                                {message}
                            </p>
                        )}

                        <button
                            type="submit"
                            className={auth.submitButton}
                            disabled={isSaving}
                        >
                            {isSaving ? 'Saving...' : 'Reset Password'}
                        </button>
                    </form>

                )}

            </div>
        </div>
    );
}

export default ResetPassword;
