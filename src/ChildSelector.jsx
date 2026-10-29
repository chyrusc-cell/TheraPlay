import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Baby, Check, ChevronDown } from 'lucide-react';
import { useChildren } from './childContext.js';

// While the selector is on screen the search pill leaves room for it (see
// --search-reserve in ui.css).
const RESERVE_ATTRIBUTE = 'data-child-selector';

const buttonClass =
    'flex h-11 max-w-[190px] cursor-pointer items-center gap-2 rounded-full border border-white/70 btn-glass px-3.5 [font-family:inherit] text-[14px] font-bold text-ink enabled:hover:bg-white/90 tablet:max-w-[150px] tablet:px-3 phone:px-2.5';

/*
 * "Choose Child": the global child switcher in the top bar (parents only). It
 * reads and changes the ONE shared selection in ChildProvider; pages react to
 * that, there is no per-page selector.
 */
function ChildSelector() {
    const { children, selectedChild, selectedChildId, status, selectChild } = useChildren();
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    const listId = useId();

    const visible = status !== 'idle';

    useEffect(() => {
        if (!visible) {
            return undefined;
        }

        document.documentElement.setAttribute(RESERVE_ATTRIBUTE, '');

        return () => document.documentElement.removeAttribute(RESERVE_ATTRIBUTE);
    }, [visible]);

    // Close on an outside click or Escape.
    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const handleMouseDown = (event) => {
            if (!containerRef.current?.contains(event.target)) {
                setOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
                containerRef.current?.querySelector('button')?.focus();
            }
        };

        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    if (!visible) {
        return null;
    }

    const wrapperClass =
        'fixed top-2 right-[76px] z-40 tablet:right-[62px]';

    // No child yet: a clear way to create the first one.
    if (status === 'ready' && children.length === 0) {
        return (
            <div className={wrapperClass}>
                <Link
                    to="/profile"
                    state={{ addChild: true }}
                    className={`${buttonClass} no-underline`}
                >
                    <Baby size={18} aria-hidden="true" className="shrink-0 text-accent" />
                    <span className="truncate phone:sr-only">Add a child</span>
                </Link>
            </div>
        );
    }

    const label =
        status === 'loading'
            ? 'Loading...'
            : status === 'error'
            ? 'Children unavailable'
            : selectedChild?.name || 'Choose child';

    return (
        <div className={wrapperClass} ref={containerRef}>

            <button
                type="button"
                className={buttonClass}
                onClick={() => setOpen((value) => !value)}
                disabled={status !== 'ready'}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-label={`Choose child. Selected: ${label}`}
                title="Choose child"
            >
                <Baby size={18} aria-hidden="true" className="shrink-0 text-accent" />
                <span className="truncate phone:sr-only">{label}</span>
                <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-muted" />
            </button>

            {open && (
                <div className="absolute top-full right-0 z-50 mt-2 w-[240px] animate-[ui-pop-in_0.18s_ease-out] rounded-2xl glass-panel p-1.5">

                    <p className="px-3 pt-1.5 pb-1 text-[11px] font-bold tracking-wide text-faint uppercase">
                        Choose child
                    </p>

                    <ul id={listId} role="listbox" aria-label="Children" className="max-h-[260px] list-none overflow-y-auto">
                        {children.map((child) => {
                            const selected = child.id === selectedChildId;

                            return (
                                <li
                                    key={child.id}
                                    role="option"
                                    aria-selected={selected}
                                    tabIndex={0}
                                    onClick={() => {
                                        selectChild(child.id);
                                        setOpen(false);
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            selectChild(child.id);
                                            setOpen(false);
                                        }
                                    }}
                                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-[14px] text-ink ${
                                        selected ? 'bg-accent-soft font-bold' : 'hover:bg-hover'
                                    }`}
                                >
                                    <span className="min-w-0 truncate">{child.name}</span>
                                    {selected && <Check size={16} aria-hidden="true" className="shrink-0 text-accent" />}
                                </li>
                            );
                        })}
                    </ul>

                    <Link
                        to="/profile"
                        onClick={() => setOpen(false)}
                        className="mt-1 block rounded-lg border-t border-edge px-3 py-2 text-[13px] font-bold text-accent no-underline hover:bg-hover"
                    >
                        Manage children
                    </Link>

                </div>
            )}

        </div>
    );
}

export default ChildSelector;
