import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Button from './Button.jsx';

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
    confirmVariant = 'primary',
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
            className="fixed inset-0 z-[1000] box-border flex animate-[ui-fade-in_0.2s_ease-out] items-center justify-center bg-[rgba(255,255,255,0.4)] p-4 backdrop-blur-[5px] supports-[not(backdrop-filter:blur(1px))]:bg-[rgba(41,37,36,0.6)]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !busy) {
                    onCancel();
                }
            }}
        >
            <div
                className="box-border w-full max-w-[380px] animate-[ui-rise-in_0.22s_ease-out] rounded-[22px] border card-soft p-7 font-[Quicksand,sans-serif]"
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

                    <Button
                        variant="secondary"
                        onClick={onCancel}
                        disabled={busy}
                        ref={cancelRef}
                    >
                        {cancelLabel}
                    </Button>

                    <Button
                        variant={confirmVariant}
                        onClick={onConfirm}
                        loading={busy}
                    >
                        {busy ? busyLabel : confirmLabel}
                    </Button>

                </div>
            </div>
        </div>,
        document.body
    );
}

export default ConfirmDialog;
