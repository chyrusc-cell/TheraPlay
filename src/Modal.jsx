import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// How long the closing fade takes before the modal is removed (ms). It matches
// the duration-200 classes below; reduced-motion users get no animation (the
// global rule in css/ui.css) and the modal simply disappears a moment later.
const CLOSE_MS = 200;

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const sizes = {
    md: 'max-w-[560px]',
    lg: 'max-w-[900px]',
    xl: 'max-w-[1040px]',
};

/*
 * A reusable modal dialog for forms and detail views.
 *  - The backdrop is a warm dark, slightly blurred glass layer over the whole page
 *    (sidebar and top shortcuts included, since it sits above them). It exists
 *    only while the modal does, and it fades in and out with the dialog. The
 *    dialog itself is a separate, unblurred layer on top. Browsers without
 *    backdrop-filter get a darker plain overlay instead.
 *  - Centered on a backdrop; the body scrolls inside (max 90% of the screen
 *    height), the header stays put, and a form can keep its buttons visible with
 *    a sticky footer (see activityFormActions in adminClasses.js).
 *  - Escape, the close button and the backdrop call onClose, except while
 *    `busy` (a save is running), so nothing can be closed mid-submission.
 *  - The page behind cannot scroll and keeps its position.
 *  - Focus moves into the dialog, Tab stays inside it, and focus returns to
 *    the element that opened it when it closes.
 *  - It fades/scales in and out. While closing it shows what it showed last,
 *    so a form that the page has already reset does not flash empty.
 */
function Modal({ open, onClose, title, busy = false, size = 'lg', children }) {
    const titleId = useId();
    const dialogRef = useRef(null);

    // mounted = in the DOM (until the closing fade is done); entered = faded in.
    // snapshot = what was last shown while open, so the closing fade still
    // shows it after the page has already reset its form. These are updated
    // while rendering (React's "derived state" pattern), not in effects.
    const [mounted, setMounted] = useState(open);
    const [entered, setEntered] = useState(false);
    const [prevOpen, setPrevOpen] = useState(open);
    const [snapshot, setSnapshot] = useState({ children, title });

    if (open !== prevOpen) {
        setPrevOpen(open);

        if (open) {
            setMounted(true);
        }
    }

    if (open && (snapshot.children !== children || snapshot.title !== title)) {
        setSnapshot({ children, title });
    }

    // Fade in one frame after mounting (so the transition has a start state);
    // after the closing fade, remove it from the DOM.
    useEffect(() => {
        if (open) {
            const frame = requestAnimationFrame(() => setEntered(true));

            return () => cancelAnimationFrame(frame);
        }

        const timer = setTimeout(() => {
            setEntered(false);
            setMounted(false);
        }, CLOSE_MS);

        return () => clearTimeout(timer);
    }, [open]);

    const visible = open && entered;

    // Lock the page scroll while the modal is in the DOM (the scrollbar space is
    // always reserved, so nothing shifts).
    useEffect(() => {
        if (!mounted) {
            return undefined;
        }

        const previous = document.body.style.overflow;

        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previous;
        };
    }, [mounted]);

    // Focus in on open, and back on the opener on close.
    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const opener = document.activeElement;

        const frame = requestAnimationFrame(() => {
            const dialog = dialogRef.current;

            if (!dialog) {
                return;
            }

            // Prefer the first field in the body; otherwise the dialog itself.
            const first = dialog.querySelector(
                '[data-modal-body] input:not([type="file"]):not([disabled]), [data-modal-body] textarea:not([disabled]), [data-modal-body] select:not([disabled])'
            );

            (first || dialog).focus();
        });

        return () => {
            cancelAnimationFrame(frame);

            if (opener && document.contains(opener)) {
                opener.focus?.();
            }
        };
    }, [open]);

    // Escape closes (unless busy); Tab stays inside the dialog.
    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                if (!busy) {
                    event.stopPropagation();
                    onClose();
                }

                return;
            }

            if (event.key !== 'Tab') {
                return;
            }

            const dialog = dialogRef.current;

            if (!dialog) {
                return;
            }

            const items = [...dialog.querySelectorAll(FOCUSABLE)].filter(
                (el) => el.offsetParent !== null
            );

            if (items.length === 0) {
                event.preventDefault();
                dialog.focus();
                return;
            }

            const first = items[0];
            const last = items[items.length - 1];

            if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, busy, onClose]);

    if (!mounted) {
        return null;
    }

    return createPortal(
        <div
            className={`fixed inset-0 z-[900] box-border flex items-center justify-center bg-[rgba(41,37,36,0.38)] p-4 backdrop-blur-[5px] transition-opacity duration-200 ease-out supports-[not(backdrop-filter:blur(1px))]:bg-[rgba(41,37,36,0.6)] ${
                visible ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !busy) {
                    onClose();
                }
            }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-busy={busy || undefined}
                tabIndex={-1}
                className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[22px] border border-white/70 bg-[rgba(255,254,252,0.92)] font-[Quicksand,sans-serif] shadow-[0_24px_60px_-18px_rgba(60,40,10,0.45),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-[14px] transition-[opacity,transform] duration-200 ease-out ${sizes[size] || sizes.lg} ${
                    visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.98] opacity-0'
                }`}
            >

                <div className="flex shrink-0 items-center justify-between gap-4 border-b border-edge px-6 py-4 phone:px-4">

                    <h2 id={titleId} className="min-w-0 text-[20px] font-bold text-ink [overflow-wrap:anywhere]">
                        {snapshot.title}
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        aria-label="Close"
                        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-muted enabled:hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>

                </div>

                <div data-modal-body className="min-h-0 flex-1 overflow-y-auto p-6 phone:p-4">
                    {snapshot.children}
                </div>

            </div>
        </div>,
        document.body
    );
}

export default Modal;
