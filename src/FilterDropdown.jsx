import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

const buttonClass =
    'flex h-11 w-full min-w-[180px] cursor-pointer items-center justify-between gap-2 rounded-full border btn-glass py-0 pl-4 pr-3.5 [font-family:inherit] text-[14px] font-bold text-ink phone:min-w-0';

/*
 * A filter dropdown that looks and behaves like the "Choose Child" selector:
 * a glass pill that opens a glass listbox. `options` is [{ value, label }].
 */
function FilterDropdown({ label, value, options, onChange }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);
    const labelId = useId();
    const valueId = useId();
    const listId = useId();

    const selected = options.find((option) => option.value === value) || options[0];

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

    const choose = (next) => {
        onChange(next);
        setOpen(false);
    };

    return (
        <div className="flex flex-col gap-1.5 phone:min-w-0 phone:flex-1">

            <span id={labelId} className="text-[13px] font-bold text-muted">
                {label}
            </span>

            <div className="relative" ref={containerRef}>

                <button
                    type="button"
                    className={buttonClass}
                    onClick={() => setOpen((current) => !current)}
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    aria-controls={open ? listId : undefined}
                    aria-labelledby={`${labelId} ${valueId}`}
                >
                    <span id={valueId} className="truncate">{selected.label}</span>
                    <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-muted" />
                </button>

                {open && (
                    <div className="absolute top-full left-0 z-50 mt-2 w-full min-w-[220px] animate-[ui-pop-in_0.18s_ease-out] rounded-2xl glass-panel p-1.5">

                        <ul id={listId} role="listbox" aria-label={label} className="max-h-[260px] list-none overflow-y-auto">
                            {options.map((option) => {
                                const isSelected = option.value === selected.value;

                                return (
                                    <li
                                        key={option.value}
                                        role="option"
                                        aria-selected={isSelected}
                                        tabIndex={0}
                                        onClick={() => choose(option.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                choose(option.value);
                                            }
                                        }}
                                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-[14px] text-ink ${
                                            isSelected ? 'bg-accent-soft font-bold' : 'hover:bg-hover'
                                        }`}
                                    >
                                        <span className="min-w-0 truncate">{option.label}</span>
                                        {isSelected && <Check size={16} aria-hidden="true" className="shrink-0 text-accent" />}
                                    </li>
                                );
                            })}
                        </ul>

                    </div>
                )}

            </div>

        </div>
    );
}

export default FilterDropdown;
