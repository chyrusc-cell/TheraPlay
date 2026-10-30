import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, clearSession, mapValidationErrors } from './api.js';
import * as ui from './adminClasses.js';
import Button from './Button.jsx';
import Modal from './Modal.jsx';

const dangerPillClass =
    'cursor-pointer rounded-[20px] border border-[#d93025]/60 btn-glass px-6 py-2 [font-family:inherit] text-[14px] font-bold text-danger-text enabled:hover:bg-danger-bg';

/*
 * Self-service account deletion (parents). It always deletes the logged-in
 * account only, after a clear warning and the current password. The server
 * refuses (and explains) when the account still has child profiles, because
 * deleting it would erase their saved progress.
 */
function DeleteAccountCard({ cardClass }) {
    const navigate = useNavigate();

    const [open, setOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [formError, setFormError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const openDialog = () => {
        setPassword('');
        setError('');
        setFormError('');
        setOpen(true);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (isDeleting) {
            return;
        }

        if (!password) {
            setError('Enter your password to confirm.');
            return;
        }

        setIsDeleting(true);
        setError('');
        setFormError('');

        try {
            const result = await apiRequest('/profile', { method: 'DELETE', body: { password } });

            if (result.status === 401) {
                clearSession();
                navigate('/login', { replace: true, state: { message: 'Please log in to continue.' } });
                return;
            }

            if (result.status === 422) {
                setError(mapValidationErrors(result.data.errors).password || 'The password is incorrect.');
                return;
            }

            if (result.status === 429) {
                setFormError('Too many attempts. Please wait a minute and try again.');
                return;
            }

            if (!result.ok) {
                // 409 (child profiles still exist) and 403 come with their own explanation.
                setFormError(result.data.message || 'Unable to delete your account. Please try again.');
                return;
            }

            // The account and its logins are gone: forget everything saved here.
            clearSession();
            navigate('/login', { replace: true, state: { message: 'Your account has been deleted.' } });
        } catch {
            setFormError('Unable to connect to the server. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className={cardClass}>
            <h2 className="mb-3 text-[18px] font-bold text-ink">Delete Account</h2>

            <p className="mb-4 text-[14px] leading-[1.5] text-muted">
                Deleting your account permanently removes it and signs you out everywhere.
                This cannot be undone. You will be asked for your password first.
            </p>

            <button type="button" className={dangerPillClass} onClick={openDialog}>
                Delete my account
            </button>

            <Modal
                open={open}
                onClose={() => setOpen(false)}
                busy={isDeleting}
                size="md"
                title="Delete your account?"
            >
                <form onSubmit={handleSubmit} noValidate>

                    <p className="mb-3 text-[14px] leading-[1.5] text-ink" id="delete-account-warning">
                        <strong>This permanently deletes your account and cannot be undone.</strong>{' '}
                        You will be logged out on every device.
                    </p>
                    <p className="mb-5 text-[13px] leading-[1.5] text-muted">
                        If you still have child profiles, remove them first. A child with saved
                        activity progress cannot be removed, so the account cannot be deleted
                        until an administrator helps.
                    </p>

                    {formError && (
                        <p className={ui.messageError} role="alert">{formError}</p>
                    )}

                    <div className={ui.formGroup}>
                        <label className={ui.label} htmlFor="delete-account-password">
                            Enter your password to confirm
                        </label>
                        <input
                            className={ui.input}
                            id="delete-account-password"
                            type="password"
                            autoComplete="current-password"
                            aria-describedby="delete-account-warning"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            disabled={isDeleting}
                        />
                        {error && <p className={ui.fieldError} role="alert">{error}</p>}
                    </div>

                    <div className={ui.activityFormActions}>
                        <button
                            type="button"
                            className={ui.cancelButton}
                            onClick={() => setOpen(false)}
                            disabled={isDeleting}
                        >
                            Cancel
                        </button>
                        <Button type="submit" variant="danger" loading={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Delete my account'}
                        </Button>
                    </div>

                </form>
            </Modal>
        </div>
    );
}

export default DeleteAccountCard;
