import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, mapValidationErrors } from './api.js';
import * as auth from './authClasses.js';

function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [isSending, setIsSending] = useState(false);

    // { type: 'success' | 'warning' | 'error', text }
    const [notice, setNotice] = useState(null);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (isSending) {
            return;
        }

        const trimmed = email.trim();

        // Quick feedback only; the server validates again.
        if (!trimmed || !/^\S+@\S+\.\S+$/.test(trimmed)) {
            setNotice({
                type: 'error',
                text: 'Please enter a valid email address.',
            });
            return;
        }

        setIsSending(true);
        setNotice(null);

        try {
            // Public endpoint: nobody is logged in on this page.
            const result = await apiRequest('/forgot-password', {
                method: 'POST',
                auth: false,
                body: { email: trimmed },
            });

            if (result.status === 422) {
                const errors = mapValidationErrors(result.data.errors);

                setNotice({
                    type: 'error',
                    text: errors.email || 'Please enter a valid email address.',
                });
                return;
            }

            if (result.status === 429) {
                setNotice({
                    type: 'error',
                    text: 'Too many requests. Please wait a minute and try again.',
                });
                return;
            }

            if (!result.ok) {
                setNotice({
                    type: 'error',
                    text:
                        result.data.message ||
                        'Unable to send the request. Please try again.',
                });
                return;
            }

            // The server's wording is used as is. It never says whether an
            // account exists, and it says plainly when email is not set up.
            setNotice({
                type: result.data.delivery_available ? 'success' : 'warning',
                text: result.data.message,
            });
        } catch {
            // The typed email stays in the box so it can be sent again.
            setNotice({
                type: 'error',
                text: 'Unable to connect to the server. Please try again.',
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className={auth.pageBg} style={auth.backgroundStyle}>
            <div className={auth.panel}>
                
                <div className={auth.logoRow}>
                    {/* Placeholder for the TheraPlay logo icon */}
                    <div></div>
                    <h2 className={auth.logoTitle}>TheraPlay!</h2>
                </div>

                <Link to="/login" className={auth.backLink}>
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                    Back to login
                </Link>

                <div className={auth.headerText}>
                    <h1 className={auth.headerTitle}>Forgot your password?</h1>
                    <p className={auth.subtitle}>Enter your email below to recover your password</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className={auth.field}>
                        <input className={auth.input}
                            type="email"
                            id="email"
                            placeholder=" "
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            disabled={isSending}
                            required
                        />
                        <label className={auth.label} htmlFor="email">Email</label>
                    </div>

                    {notice && (
                        <p
                            role={notice.type === 'error' ? 'alert' : 'status'}
                            className={
                                notice.type === 'success'
                                    ? auth.messageSuccess
                                    : notice.type === 'warning'
                                        ? auth.messageWarning
                                        : auth.messageError
                            }
                        >
                            {notice.text}
                        </p>
                    )}

                    <button
                        type="submit"
                        className={auth.submitButton}
                        disabled={isSending}
                    >
                        {isSending ? 'Sending...' : 'Submit'}
                    </button>
                </form>

                <div className={auth.divider}>
                    <span className={auth.dividerText}>Or login with</span>
                </div>

                <div className={auth.socialRow}>
                    <button type="button" className={auth.socialButton}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="#1877F2">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                    </button>
                    <button type="button" className={auth.socialButton}>
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="#DB4437">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                    </button>
                </div>
                
            </div>
        </div>
    );
}

export default ForgotPassword;