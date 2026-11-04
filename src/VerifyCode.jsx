import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import * as auth from './authClasses.js';
import { apiRequest } from './api.js';
import { useAuth } from './authContext.js';
import OnboardingFrame from './OnboardingFrame.jsx';
import { useDocumentTitle } from './useDocumentTitle.js';

const CODE_LENGTH = 6;
// How long the Resend button stays disabled after a code was sent.
const RESEND_COOLDOWN_SECONDS = 30;

const digitsOnly = (value) => String(value).replace(/\D/g, '').slice(0, CODE_LENGTH);

const formatClock = (seconds) =>
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const noticeClass = {
    error: auth.registerMessageError,
    success: auth.registerMessageSuccess,
    warning: 'my-3 text-[14px] text-[#b26a00]',
};

/*
 * Stage 2 of sign-up: the six-digit code that was emailed to the parent. The
 * server checks it (hashed, expiring, single use, rate and attempt limited);
 * this page only collects it. A correct code verifies the account, and the
 * OnboardingGate then moves the parent on to the child profile without a login.
 */
function VerifyCode() {
    useDocumentTitle('Check your email');

    const { user, updateUser } = useAuth();
    const { state } = useLocation();

    const [code, setCode] = useState('');
    const [notice, setNotice] = useState(null);
    const [secondsLeft, setSecondsLeft] = useState(null);
    const [statusKnown, setStatusKnown] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const busy = useRef(false);

    // Is there a live code, and for how long? (Survives a refresh.)
    useEffect(() => {
        const controller = new AbortController();

        (async () => {
            try {
                const result = await apiRequest('/email/code/status', { signal: controller.signal });

                if (result.ok) {
                    setSecondsLeft(result.data.expires_in ?? null);
                }
            } catch {
                // The countdown simply stays unknown.
            } finally {
                if (!controller.signal.aborted) {
                    setStatusKnown(true);
                }
            }
        })();

        return () => controller.abort();
    }, []);

    // One-second ticks for the expiry countdown and the resend cooldown.
    useEffect(() => {
        const timer = setInterval(() => {
            setSecondsLeft((value) => (value === null ? null : Math.max(0, value - 1)));
            setCooldown((value) => Math.max(0, value - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const expired = statusKnown && (secondsLeft === null || secondsLeft <= 0);
    const email = user?.email;

    const handleVerify = async (event) => {
        event.preventDefault();

        if (busy.current || code.length !== CODE_LENGTH) {
            return;
        }

        busy.current = true;
        setIsVerifying(true);
        setNotice(null);

        try {
            const result = await apiRequest('/email/code/verify', { method: 'POST', body: { code } });

            if (result.ok) {
                setNotice({ type: 'success', text: 'Email verified! Taking you to your child profile...' });
                // The server's account summary now says "create_child"; the gate
                // moves the parent on.
                updateUser(result.data.user);
                return;
            }

            if (result.status === 429) {
                setNotice({ type: 'error', text: 'Too many attempts. Please wait a minute and try again.' });
            } else if (result.status === 410) {
                setSecondsLeft(null);
                setNotice({ type: 'error', text: 'This code has expired. Request a new code below.' });
            } else if (result.data.status === 'too_many_attempts') {
                setSecondsLeft(null);
                setCode('');
                setNotice({ type: 'error', text: 'Too many incorrect codes. That code no longer works; request a new one below.' });
            } else if (result.data.status === 'invalid') {
                const left = result.data.attempts_left;
                setNotice({
                    type: 'error',
                    text: `That code is not correct.${left ? ` You have ${left} ${left === 1 ? 'try' : 'tries'} left.` : ''}`,
                });
            } else if (result.status === 422) {
                setNotice({ type: 'error', text: result.data.errors?.code?.[0] || 'Enter the six-digit code from the email.' });
            } else {
                setNotice({ type: 'error', text: result.data.message || 'Unable to verify the code. Please try again.' });
            }
        } catch {
            setNotice({ type: 'error', text: 'Unable to connect to the server. Please try again.' });
        } finally {
            busy.current = false;
            setIsVerifying(false);
        }
    };

    const handleResend = async () => {
        if (busy.current || isSending || cooldown > 0) {
            return;
        }

        busy.current = true;
        setIsSending(true);
        setNotice(null);

        try {
            const result = await apiRequest('/email/code/resend', { method: 'POST' });

            if (result.status === 429) {
                setNotice({ type: 'error', text: 'Please wait a minute before asking for another code.' });
            } else if (!result.ok) {
                setNotice({ type: 'error', text: result.data.message || 'We could not send a code right now. Please try again.' });
            } else if (result.data.status === 'already_verified') {
                updateUser({ email_verified: true, onboarding: 'create_child' });
            } else {
                setCode('');
                setSecondsLeft(result.data.expires_in ?? null);
                setCooldown(RESEND_COOLDOWN_SECONDS);
                setNotice({
                    type: result.data.delivered ? 'success' : 'warning',
                    text: result.data.message,
                });
            }
        } catch {
            setNotice({ type: 'error', text: 'Unable to connect to the server. Please try again.' });
        } finally {
            busy.current = false;
            setIsSending(false);
        }
    };

    const handlePaste = (event) => {
        const pasted = digitsOnly(event.clipboardData.getData('text'));

        if (pasted) {
            event.preventDefault();
            setCode(pasted);
        }
    };

    // Sign-up told us the email could not be sent: say so instead of "we sent it".
    const sendFailed = state?.sent === false && !(secondsLeft > 0);

    return (
        <OnboardingFrame
            current={2}
            title="Check your email"
            subtitle={
                <>
                    We sent a six-digit code to <strong>{email || 'your email address'}</strong>. Enter it
                    below to verify your email. This is required before you can create your child&apos;s profile.
                </>
            }
        >
            <form onSubmit={handleVerify} noValidate>

                <div className={auth.field}>
                    <input className={`${auth.input} text-center text-[24px] tracking-[0.5em]`}
                        id="verification-code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]*"
                        maxLength={CODE_LENGTH}
                        placeholder=" "
                        value={code}
                        onChange={(event) => setCode(digitsOnly(event.target.value))}
                        onPaste={handlePaste}
                        disabled={isVerifying}
                        aria-describedby="code-help"
                        required
                    />
                    <label className={auth.label} htmlFor="verification-code">Verification code</label>
                </div>

                <p id="code-help" className="mb-4 text-[13px] text-muted" role="status">
                    {!statusKnown
                        ? 'Checking your code...'
                        : expired
                          ? 'Your code has expired or none is active. Request a new one below.'
                          : `The code expires in ${formatClock(secondsLeft)}.`}
                </p>

                {sendFailed && (
                    <p className={noticeClass.warning} role="status">
                        We could not send the email when you signed up. Use &quot;Resend code&quot; to get one.
                    </p>
                )}

                {notice && (
                    <p className={noticeClass[notice.type]} role={notice.type === 'error' ? 'alert' : 'status'}>
                        {notice.text}
                    </p>
                )}

                <button
                    type="submit"
                    className={auth.registerButton}
                    disabled={isVerifying || code.length !== CODE_LENGTH}
                >
                    {isVerifying ? 'Verifying...' : 'Verify'}
                </button>

                <button
                    type="button"
                    className="mb-3 w-full cursor-pointer rounded-full border btn-glass btn-white p-3 [font-family:inherit] text-[15px] font-bold text-ink disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleResend}
                    disabled={isSending || isVerifying || cooldown > 0}
                >
                    {isSending ? 'Sending...' : cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
                </button>

                <p className="mb-2 text-center text-[12px] text-faint">
                    Check your spam folder if you cannot find the email. Asking for a new code makes the
                    earlier one stop working.
                </p>

            </form>
        </OnboardingFrame>
    );
}

export default VerifyCode;
