import * as admin from './adminClasses.js';
import {
    activityCardShell,
    activityGridClass,
    contactItemClass,
    detailsCardClass,
} from './uiClasses.js';

// Small loading placeholders. They show the SHAPE of what is loading, never
// fake data, and are announced to screen readers as a single "loading" status.
//
// Layout and spacing are Tailwind utilities. Only the shimmer itself (the
// moving gradient and its reduced-motion fallback) is custom CSS: the
// `.skeleton` class in css/ui.css.
//
// The real cards and their skeletons share class strings from uiClasses.js so
// they always have the same shape.

const cardClass = 'rounded-2xl border border-edge bg-white card-soft p-5';

export function SkeletonStatus({ label, children, className }) {
    return (
        <div
            className={className}
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <span className="sr-only">{label}</span>
            <div aria-hidden="true" className="contents">
                {children}
            </div>
        </div>
    );
}

// A single block. Pass Tailwind classes for its size; it is rounded unless you
// give it a radius of your own.
export function SkeletonBlock({ className = '', style }) {
    const radius = className.includes('rounded') ? '' : 'rounded-md';

    return (
        <span
            className={`skeleton block ${radius} ${className}`}
            style={style}
        />
    );
}

// Activity cards: same grid as the real list.
export function ActivityCardsSkeleton({ count = 6, filters = 3 }) {
    return (
        <SkeletonStatus label="Loading activities...">
            {/* The filter dropdowns (label + rounded pill) of the real page: Category, Difficulty and, for a parent with a child, Status. */}
            <div className="mb-8 flex flex-wrap items-end gap-4">
                {Array.from({ length: filters }, (_, i) => i).map((index) => (
                    <div className="flex flex-col gap-1.5 phone:min-w-0 phone:flex-1" key={index}>
                        <SkeletonBlock className="h-3.5 w-16" />
                        <SkeletonBlock className="h-[42px] w-full min-w-[180px] rounded-full phone:min-w-0" />
                    </div>
                ))}
            </div>

            <div className={activityGridClass}>
                {Array.from({ length: count }, (_, index) => (
                    <div className={`${activityCardShell} pointer-events-none`} key={index}>
                        <SkeletonBlock className="mb-5 h-[180px] rounded-lg" />
                        <SkeletonBlock className="mb-3.5 h-[22px] w-[70%]" />
                        <SkeletonBlock className="mb-2.5 h-3.5" />
                        <SkeletonBlock className="mb-2.5 h-3.5 w-3/5" />
                    </div>
                ))}
            </div>
        </SkeletonStatus>
    );
}

// Admin tables: keeps the real header, shows rows where data will appear.
export function TableSkeleton({ label, columns, rows = 5 }) {
    return (
        <SkeletonStatus label={label} className={admin.tableContainer}>
            <table className={admin.table}>
                <thead className={admin.thead}>
                    <tr>
                        {columns.map((column) => (
                            <th className={admin.th} key={column}>{column}</th>
                        ))}
                    </tr>
                </thead>
            </table>

            {Array.from({ length: rows }, (_, index) => (
                <div
                    className="flex gap-3 border-b border-edge p-4 last:border-b-0"
                    key={index}
                >
                    {columns.map((column) => (
                        <SkeletonBlock key={column} className="h-4 flex-1" />
                    ))}
                </div>
            ))}
        </SkeletonStatus>
    );
}

// Contact cards: the same stacked cards as the real Contact Us list (glass cards with
// a round picture on the left and the details on the right). The side and bottom padding
// matches the scrolling list, which leaves room for the cards' shadows.
export function ContactCardsSkeleton({ count = 3, padded = true }) {
    return (
        <SkeletonStatus
            label="Loading contacts..."
            className={`flex flex-col gap-3 ${padded ? 'px-1.5 pt-1 pb-3' : ''}`}
        >
            {Array.from({ length: count }, (_, index) => (
                <div className={`${contactItemClass} flex items-start gap-4 phone:gap-3`} key={index}>
                    <SkeletonBlock className="h-28 w-28 shrink-0 rounded-full phone:h-20 phone:w-20" />
                    <div className="min-w-0 flex-1">
                        <SkeletonBlock className="mb-3 h-[22px] w-[60%]" />
                        <SkeletonBlock className="mb-2.5 h-3.5 w-1/2" />
                        <SkeletonBlock className="h-3.5" />
                    </div>
                </div>
            ))}
        </SkeletonStatus>
    );
}

// A stack of text lines, for list-like sections (feedback, recent items).
export function LinesSkeleton({ label, lines = 4 }) {
    return (
        <SkeletonStatus label={label}>
            {Array.from({ length: lines }, (_, index) => (
                <SkeletonBlock
                    key={index}
                    className={`mb-2.5 h-3.5 ${index % 2 ? 'w-3/5' : ''}`}
                />
            ))}
        </SkeletonStatus>
    );
}

// Activity details: the same two-column card as the real page.
export function ActivityDetailsSkeleton() {
    return (
        <SkeletonStatus label="Loading activity...">
            <div className={detailsCardClass}>
                <SkeletonBlock className="h-[220px] rounded-lg" />

                <div>
                    {/* Name, labels and the completion button. On phones they stack centered: name, labels, button. */}
                    <div className="mb-6 phone-lg:flex phone-lg:flex-col phone-lg:items-center">
                        <div className="mb-3 flex items-start justify-between gap-4 phone-lg:contents">
                            <SkeletonBlock className="h-[30px] w-[55%] phone-lg:mb-3" />
                            <SkeletonBlock className="h-10 w-[160px] shrink-0 rounded-xl phone-lg:order-2" />
                        </div>

                        <div className="flex gap-2 phone-lg:order-1 phone-lg:mb-4">
                            <SkeletonBlock className="h-7 w-[90px] rounded-[5px]" />
                            <SkeletonBlock className="h-7 w-[90px] rounded-[5px]" />
                        </div>
                    </div>

                    <SkeletonBlock className="mb-2.5 h-3.5" />
                    <SkeletonBlock className="mb-2.5 h-3.5" />
                    <SkeletonBlock className="mb-2.5 h-3.5 w-3/5" />

                    <SkeletonBlock className="mt-6 mb-2.5 h-3.5" />
                    <SkeletonBlock className="mb-2.5 h-3.5" />
                    <SkeletonBlock className="mb-2.5 h-3.5 w-3/5" />
                </div>
            </div>
        </SkeletonStatus>
    );
}

// Generic page placeholder: a heading and a few cards.
export function CardsSkeleton({ label, cards = 2 }) {
    return (
        <SkeletonStatus label={label}>
            <SkeletonBlock className="mb-6 h-8 w-2/5" />

            {Array.from({ length: cards }, (_, index) => (
                <div className={`${cardClass} mb-6`} key={index}>
                    <SkeletonBlock className="mb-3.5 h-[22px] w-[70%]" />
                    <SkeletonBlock className="mb-2.5 h-3.5" />
                    <SkeletonBlock className="mb-2.5 h-3.5" />
                    <SkeletonBlock className="mb-2.5 h-3.5 w-3/5" />
                </div>
            ))}
        </SkeletonStatus>
    );
}
