import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest, getToken } from './api.js';
import * as auth from './authClasses.js';
import { logo } from './brand.js';
import { useDocumentTitle } from './useDocumentTitle.js';

// What each answer from the server means for the person.
const outcomes = {
    verified: {
        tone: 'success',
        title: 'Email verified',
        text: 'Your email address is verified. Thank you!',
    },
    email_changed: {
        tone: 'success',
        title: 'Email address changed',
        text: 'Your new email address is verified and is now your account email. Use it the next time you log in.',
    },
    already_verified: {
        tone: 'success',
        title: 'Already verified',
        text: 'This email address was already verified. Nothing more to do.',
    },
    expired: {
        tone: 'error',
        title: 'This link has expired',
        text: 'Verification links only work for a limited time. Request a new one and use it right away.',
    },
    invalid: {
        tone: 'error',
        title: 'This link is not valid',
        text: 'The link may be incomplete, may already have been replaced by a newer one, or may not be meant for this account. Request a new one.',
    },
    email_taken: {
        tone: 'error',
        title: 'Address already in use',
        text: 'That email address now belongs to another account, so it cannot be used here. Choose a different address in your profile.',
    },
    rate_limited: {
        tone: 'error',
        title: 'Too many attempts',
        text: 'Please wait a minute and open the link again.',
    },
    error: {
        tone: 'error',
        title: 'Could not verify',
        text: 'We could not reach the server. Check your connection and open the link again.',
    },
};

// Opened from the link in the verification email:
//   /verify-email?id=..&hash=..&expires=..&signature=..
// The page sends that same signed request to the API once. The server decides
// (signature, expiry, which address); this page only reports the answer.
function VerifyEmail() {
    useDocumentTitle('Verify your email');

    const [params] = useSearchParams();
    const id = params.get('id');
    const hash = params.get('hash');
    const expires = params.get('expires');
    const signature = params.get('signature');
    const incomplete = !id || !hash || !expires || !signature;

    const [outcome, setOutcome] = useState(incomplete ? 'invalid' : 'verifying');
    const [resend, setResend] = useState(null);
    const [isSending, setIsSending] = useState(false);

    // The link must be used once. This guard makes sure the request is sent once
    // even where React runs effects twice in development.
    const started = useRef(false);
    const mounted = useRef(false);

    useEffect(() => {
        mounted.current = true;

        if (!incomplete && !started.current) {
            started.current = true;

            (async () => {
                let next = 'error';

                try {
                    // Same order as in the email: expires, then signature.
                    const result = await apiRequest(
                        `/email/verify/${encodeURIComponent(id)}/${encodeURIComponent(hash)}` +
                            `?expires=${encodeURIComponent(expires)}&signature=${encodeURIComponent(signature)}`,
                        { method: 'POST', auth: false }
                    );

                    if (result.status === 429) {
                        next = 'rate_limited';
                    } else if (result.data.status && outcomes[result.data.status]) {
                        next = result.data.status;
                    }
                } catch {
                    next = 'error';
                }

                if (mounted.current) {
                    setOutcome(next);
                }
            })();
        }

        return () => {
            mounted.current = false;
        };
    }, [incomplete, id, hash, expires, signature]);

    const loggedIn = Boolean(getToken());

    const handleResend = async () => {
        if (isSending) {
            return;
        }

        setIsSending(true);
        setResend(null);

        try {
            const result = await apiRequest('/email/verification-notification', { method: 'POST' });

            if (result.status === 429) {
                setResend({ type: 'error', text: 'Please wait a minute before asking again.' });
            } else if (result.status === 401) {
                setResend({ type: 'error', text: 'Please log in first, then request a new link.' });
            } else if (!result.ok) {
                setResend({ type: 'error', text: result.data.message || 'Unable to send the email. Please try again.' });
            } else {
                setResend({ type: result.data.delivered || result.data.already_verified ? 'success' : 'warning', text: result.data.message });
            }
        } catch {
            setResend({ type: 'error', text: 'Unable to connect to the server. Please try again.' });
        } finally {
            setIsSending(false);
        }
    };

    const shown = outcomes[outcome];
    const failed = shown?.tone === 'error';
    const canAskForNewLink = outcome === 'expired' || outcome === 'invalid';

    return (
        <main className={auth.pageBg}>
            <div className={auth.panel}>

                <div className={auth.logoRow}>
                    <img src={logo} alt="TheraPlay" className={auth.logoImage} />
                </div>

                <div className={auth.headerText}>
                    <h1 className={auth.headerTitle}>{shown ? shown.title : 'Verifying your email'}</h1>
                </div>

                {outcome === 'verifying' ? (

                    <p className={auth.subtitle} role="status">Checking your verification link...</p>

                ) : (

                    <>
                        <p
                            className={failed ? auth.messageError : auth.messageSuccess}
                            role={failed ? 'alert' : 'status'}
                        >
                            {shown.text}
                        </p>

                        {canAskForNewLink && loggedIn && (
                            <button type="button" className={auth.submitButton} onClick={handleResend} disabled={isSending}>
                                {isSending ? 'Sending...' : 'Send me a new link'}
                            </button>
                        )}

                        {canAskForNewLink && !loggedIn && (
                            <p className={auth.subtitle}>
                                Log in, then open your Profile to request a new verification email.
                            </p>
                        )}

                        {resend && (
                            <p
                                className={resend.type === 'success' ? auth.messageSuccess : resend.type === 'warning' ? auth.messageWarning : auth.messageError}
                                role={resend.type === 'error' ? 'alert' : 'status'}
                            >
                                {resend.text}
                            </p>
                        )}

                        <p className={auth.switchLinkLogin}>
                            <Link to={loggedIn ? '/profile' : '/login'} className={auth.switchLinkAnchor}>
                                {loggedIn ? 'Go to my profile' : 'Go to login'}
                            </Link>
                        </p>
                    </>

                )}

            </div>
        </main>
    );
}

export default VerifyEmail;
