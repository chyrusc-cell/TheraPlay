import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, mapValidationErrors } from './api.js';
import * as auth from './authClasses.js';
import { logo } from './brand.js';

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
        <main className={auth.pageBg}>
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

                
            </div>
        </main>
    );
}

export default ForgotPassword;