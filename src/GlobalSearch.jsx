import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useAuth } from './authContext.js';
import { apiRequest } from './api.js';
import { audienceFor, searchActivities, searchPages } from './searchIndex.js';
import useScrolled from './useScrolled.js';

// Class strings (colors come from the design tokens in css/tailwind.css; the
// focus ring on the input is the global one from css/ui.css).
// The input itself is see-through and borderless: the glass look belongs to the
// pill around it (below). It fills the whole pill and is fully rounded, so the
// global focus ring follows the pill's shape.
const inputClass =
    'h-11 w-full rounded-full border-0 bg-transparent pr-9 pl-10 [font-family:inherit] text-[14px] font-medium text-ink placeholder:text-[#888]';

// The floating pill. It is fixed to the viewport, so it stays in view while the
// page scrolls, and it is the only thing that floats (no bar behind it).
//
// Horizontal position: it is measured from the content area, not the screen.
// --search-left = sidebar width + a share of the space to the right of the
// sidebar. That puts it left of the content's centre (about a tenth of the way
// in on desktop) and keeps it clear of the sidebar. Below 900px the sidebar is
// the narrow rail, and on phones the pill sits just beside it. Its width is
// capped at 460px and always leaves room on the right for the profile shortcut.
const pillBase =
    'fixed top-2 left-[var(--search-left)] z-40 w-[min(460px,calc(100vw_-_var(--search-left)_-_90px))] rounded-full border border-black/10 transition duration-200 motion-reduce:transition-none [--search-left:calc(var(--sidebar-width)_+_(100vw_-_var(--sidebar-width))_*_0.1)] tablet:[--search-left:calc(var(--sidebar-width-collapsed)_+_(100vw_-_var(--sidebar-width-collapsed))_*_0.06)] phone:[--search-left:calc(var(--sidebar-width-collapsed)_+_12px)]';

// At the top of the page the pill is only lightly tinted. After scrolling its
// OWN background becomes more visible and blurs whatever passes behind it
// (backdrop-blur blurs the background only, never the text or icons).
const pillTop = 'bg-white/40 backdrop-blur-none';
const pillScrolled =
    'bg-white/60 shadow-[0_4px_20px_rgba(0,0,0,0.08)] backdrop-blur-md';

const dropdownClass =
    'absolute top-full right-0 left-0 z-50 mt-2 max-h-[340px] animate-[ui-pop-in_0.18s_ease-out] overflow-y-auto rounded-xl border border-[#eaeaea] bg-white p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.12)]';

const optionBase =
    'flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-[14px] text-ink';

/*
 * Global search: finds pages and activities and goes straight to them.
 * It lives in the shared layout header, so it is available on every page that
 * uses the layout. Everything is client-side:
 *  - pages come from searchIndex.js (real routes, filtered by who is searching)
 *  - activities come from the public GET /api/activities, loaded ONCE the first
 *    time the search is used (not on every keystroke)
 * Which pages are suggested depends on the server-verified account (useAuth),
 * never on anything saved in the browser. Suggestions are only a shortcut: the
 * route guards still protect the pages themselves.
 */
function GlobalSearch() {
    const navigate = useNavigate();
    const { status, user } = useAuth();
    const audience = audienceFor(status, user);
    const scrolled = useScrolled();

    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [activities, setActivities] = useState([]);

    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const activitiesRequested = useRef(false);

    const listId = useId();
    const optionId = (index) => `${listId}-option-${index}`;

    // Fetch the activity list once, the first time the search is used. If it
    // fails, the next use tries again.
    const ensureActivities = async () => {
        if (activitiesRequested.current) {
            return;
        }

        activitiesRequested.current = true;

        try {
            const result = await apiRequest('/activities', { auth: false });

            if (!result.ok) {
                throw new Error('Unable to load activities.');
            }

            setActivities(Array.isArray(result.data.data) ? result.data.data : []);
        } catch {
            activitiesRequested.current = false;
        }
    };

    const hasQuery = query.trim() !== '';

    const results = useMemo(
        () =>
            hasQuery
                ? [
                      ...searchPages(query, audience),
                      ...searchActivities(query, activities),
                  ]
                : [],
        [query, audience, activities, hasQuery]
    );

    const showDropdown = isOpen && hasQuery;

    // Close when clicking anywhere outside the search.
    useEffect(() => {
        const handleMouseDown = (event) => {
            if (!containerRef.current?.contains(event.target)) {
                setIsOpen(false);
                setActiveIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleMouseDown);

        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, []);

    // Keep the highlighted suggestion visible while moving with the arrow keys.
    useEffect(() => {
        if (activeIndex >= 0) {
            document
                .getElementById(`${listId}-option-${activeIndex}`)
                ?.scrollIntoView({ block: 'nearest' });
        }
    }, [activeIndex, listId]);

    const choose = (item) => {
        navigate(item.path);
        setQuery('');
        setIsOpen(false);
        setActiveIndex(-1);
    };

    const handleChange = (event) => {
        setQuery(event.target.value);
        setIsOpen(true);
        setActiveIndex(-1);
        ensureActivities();
    };

    const handleKeyDown = (event) => {
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                setIsOpen(true);

                if (results.length > 0) {
                    setActiveIndex((index) => (index + 1) % results.length);
                }
                break;

            case 'ArrowUp':
                event.preventDefault();
                setIsOpen(true);

                if (results.length > 0) {
                    setActiveIndex((index) =>
                        index <= 0 ? results.length - 1 : index - 1
                    );
                }
                break;

            case 'Enter': {
                // Nothing typed: do nothing. Otherwise open the highlighted
                // suggestion, or the first one if none is highlighted.
                if (!hasQuery) {
                    return;
                }

                event.preventDefault();

                const item = results[activeIndex >= 0 ? activeIndex : 0];

                if (item) {
                    choose(item);
                }
                break;
            }

            case 'Escape':
                if (isOpen) {
                    event.preventDefault();
                }

                setIsOpen(false);
                setActiveIndex(-1);
                break;

            case 'Tab':
                setIsOpen(false);
                setActiveIndex(-1);
                break;

            default:
                break;
        }
    };

    const clear = () => {
        setQuery('');
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.focus();
    };

    return (
        <div
            ref={containerRef}
            className={`${pillBase} ${scrolled ? pillScrolled : pillTop}`}
        >

            <Search
                size={18}
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#888]"
            />

            <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-label="Search pages and activities"
                aria-autocomplete="list"
                aria-expanded={showDropdown && results.length > 0}
                aria-controls={showDropdown && results.length > 0 ? listId : undefined}
                aria-activedescendant={
                    showDropdown && activeIndex >= 0 ? optionId(activeIndex) : undefined
                }
                autoComplete="off"
                placeholder="Search pages, activities, and more..."
                value={query}
                onChange={handleChange}
                onFocus={() => {
                    ensureActivities();

                    if (hasQuery) {
                        setIsOpen(true);
                    }
                }}
                onKeyDown={handleKeyDown}
                className={inputClass}
            />

            {hasQuery && (
                <button
                    type="button"
                    onClick={clear}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-2 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-1 text-[#888] enabled:hover:text-ink"
                >
                    <X size={16} aria-hidden="true" />
                </button>
            )}

            {showDropdown && results.length > 0 && (
                <ul
                    id={listId}
                    role="listbox"
                    aria-label="Search suggestions"
                    className={dropdownClass}
                >
                    {results.map((item, index) => (
                        <li
                            key={item.key}
                            id={optionId(index)}
                            role="option"
                            aria-selected={index === activeIndex}
                            // Keep the focus in the input while clicking.
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => choose(item)}
                            className={`${optionBase} ${
                                index === activeIndex ? 'bg-[#e9ecef]' : 'bg-transparent'
                            }`}
                        >
                            <span className="min-w-0">
                                <span className="block truncate font-medium">
                                    {item.label}
                                </span>

                                {item.description && (
                                    <span className="block truncate text-[12px] text-muted">
                                        {item.description}
                                    </span>
                                )}
                            </span>

                            <span className="shrink-0 rounded-md bg-hover px-2 py-0.5 text-[11px] font-medium text-muted">
                                {item.hint}
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            {showDropdown && results.length === 0 && (
                <div role="status" className={`${dropdownClass} px-4 py-3 text-[14px] text-muted`}>
                    No matching pages or activities for “{query.trim()}”.
                </div>
            )}

        </div>
    );
}

export default GlobalSearch;
