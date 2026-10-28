import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Shared button looks for the dialog. Active/disabled colors come from the
// design tokens (css/tailwind.css); the focus ring is the global one (ui.css).
const buttonBase =
    'cursor-pointer rounded-3xl px-[22px] py-2.5 [font-family:inherit] text-sm font-bold';

const cancelClass = `${buttonBase} border border-[#333] bg-white text-[#333] enabled:hover:bg-hover`;

const confirmClass = `${buttonBase} border-0 bg-primary text-white enabled:hover:bg-primary-hover`;

/*
 * A small reusable "are you sure?" dialog.
 *  - Escape, the backdrop and Cancel all call onCancel (disabled while busy).
 *  - Focus starts on Cancel, stays inside the dialog, and returns to the
 *    button that opened it when the dialog closes.
 *  - The short fade-in uses keyframes from ui.css, which prefers-reduced-motion
 *    switches off.
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
            className="fixed inset-0 z-[1000] box-border flex animate-[ui-fade-in_0.2s_ease-out] items-center justify-center bg-black/40 p-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !busy) {
                    onCancel();
                }
            }}
        >
            <div
                className="box-border w-full max-w-[380px] animate-[ui-rise-in_0.22s_ease-out] rounded-xl bg-white p-7 font-[Quicksand,sans-serif] shadow-[0_10px_40px_rgba(0,0,0,0.2)]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-message"
                ref={dialogRef}
            >
                <h2
                    id="confirm-dialog-title"
                    className="mb-2 text-xl font-bold text-ink"
                >
                    {title}
                </h2>

                <p
                    id="confirm-dialog-message"
                    className="mb-6 text-sm leading-normal text-muted"
                >
                    {message}
                </p>

                <div className="flex justify-end gap-3">

                    <button
                        type="button"
                        className={cancelClass}
                        onClick={onCancel}
                        disabled={busy}
                        ref={cancelRef}
                    >
                        {cancelLabel}
                    </button>

                    <button
                        type="button"
                        className={confirmClass}
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
