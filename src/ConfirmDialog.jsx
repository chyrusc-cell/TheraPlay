import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import './css/ConfirmDialog.css';

/*
 * A small reusable "are you sure?" dialog.
 *  - Escape, the backdrop and Cancel all call onCancel (disabled while busy).
 *  - Focus starts on Cancel, stays inside the dialog, and returns to the
 *    button that opened it when the dialog closes.
 */
function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = 'Confirm',
    busyLabel = 'Please wait...',
    cancelLabel = 'Cancel',
    busy = false,
    onConfirm,
    onCancel,
}) {
    const dialogRef = useRef(null);
    const cancelRef = useRef(null);

    // Move focus in when the dialog opens, and back out when it closes.
    useEffect(() => {
        if (!open) {
            return;
        }

        const previouslyFocused = document.activeElement;

        cancelRef.current?.focus();

        return () => previouslyFocused?.focus?.();
    }, [open]);

    // Escape closes the dialog; Tab cycles through its buttons only.
    useEffect(() => {
        if (!open) {
            return;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && !busy) {
                onCancel();
                return;
            }

            if (event.key !== 'Tab') {
                return;
            }

            const buttons = dialogRef.current
                ? [...dialogRef.current.querySelectorAll('button:not([disabled])')]
                : [];

            if (buttons.length === 0) {
                event.preventDefault();
                return;
            }

            const first = buttons[0];
            const last = buttons[buttons.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            } else if (!dialogRef.current.contains(document.activeElement)) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, busy, onCancel]);

    if (!open) {
        return null;
    }

    return createPortal(
        <div
            className="confirm-overlay"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !busy) {
                    onCancel();
                }
            }}
        >
            <div
                className="confirm-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-message"
                ref={dialogRef}
            >
                <h2 id="confirm-dialog-title">
                    {title}
                </h2>

                <p id="confirm-dialog-message">
                    {message}
                </p>

                <div className="confirm-actions">

                    <button
                        type="button"
                        className="confirm-cancel"
                        onClick={onCancel}
                        disabled={busy}
                        ref={cancelRef}
                    >
                        {cancelLabel}
                    </button>

                    <button
                        type="button"
                        className="confirm-confirm"
                        onClick={onConfirm}
                        disabled={busy}
                    >
                        {busy ? busyLabel : confirmLabel}
                    </button>

                </div>
            </div>
        </div>,
        document.body
    );
}

export default ConfirmDialog;
