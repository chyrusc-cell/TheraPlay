import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, clearSession } from './api.js';

const smallPillClass =
    'cursor-pointer rounded-full border border-edge-strong btn-glass px-4 py-1.5 [font-family:inherit] text-[13px] font-bold text-ink enabled:hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60';

const noticeColors = {
    success: 'text-[#188038]',
    warning: 'text-[#b26a00]',
    error: 'text-[#d93025]',
};

/*
 * Whether the account's email address is verified, a waiting (pending) new
 * address, and a way to ask for the verification email again. The status comes
 * from the server (GET /api/user); nothing here can mark an address verified, only
 * the emailed link can.
 */
function EmailVerificationStatus({ user }) {
    const navigate = useNavigate();
    const [isSending, setIsSending] = useState(false);
    const [notice, setNotice] = useState(null);

    if (!user) {
        return null;
    }

    const pending = user.pending_email || null;
    const verified = Boolean(user.email_verified);

    if (verified && !pending) {
        return (
            <p className="mt-6 text-[13px] font-medium text-[#188038]" data-testid="email-status">
                <span aria-hidden="true">✓ </span>Your email address is verified.
            </p>
        );
    }

    const handleResend = async () => {
        if (isSending) {
            return;
        }

        setIsSending(true);
        setNotice(null);

        try {
            const result = await apiRequest('/email/verification-notification', { method: 'POST' });

            if (result.status === 401) {
                clearSession();
                navigate('/login', { replace: true, state: { message: 'Please log in to continue.' } });
                return;
            }

            if (result.status === 429) {
                setNotice({ type: 'error', text: 'Please wait a minute before asking for another email.' });
                return;
            }

            if (!result.ok) {
                setNotice({
                    type: 'error',
                    text: result.data.message || 'Unable to send the verification email. Please try again.',
                });
                return;
            }

            // Success only when the server says the email was really delivered.
            setNotice({
                type: result.data.delivered || result.data.already_verified ? 'success' : 'warning',
                text: result.data.message,
            });
        } catch {
            setNotice({ type: 'error', text: 'Unable to connect to the server. Please try again.' });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="mt-6 rounded-lg border border-edge card-soft p-4" data-testid="email-status">

            {pending ? (
                <p className="mb-3 text-[14px] leading-[1.5] text-ink">
                    <strong>Waiting for verification:</strong> {pending}. Your account email stays{' '}
                    <strong>{user.email}</strong> until you open the link we sent to the new address.
                </p>
            ) : (
                <p className="mb-3 text-[14px] leading-[1.5] text-ink">
                    <strong>Your email address is not verified.</strong> Open the link in the
                    verification email we sent to {user.email}.
                </p>
            )}

            <button type="button" className={smallPillClass} onClick={handleResend} disabled={isSending}>
                {isSending ? 'Sending...' : 'Resend verification email'}
            </button>

            {notice && (
                <p
                    className={`mt-3 text-[13px] font-medium ${noticeColors[notice.type]}`}
                    role={notice.type === 'error' ? 'alert' : 'status'}
                >
                    {notice.text}
                </p>
            )}

        </div>
    );
}

export default EmailVerificationStatus;
