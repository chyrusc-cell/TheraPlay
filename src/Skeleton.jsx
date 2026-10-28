import * as admin from './adminClasses.js';
import {
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

const cardClass = 'rounded-2xl border border-[#eaeaea] bg-white p-5';

function SkeletonStatus({ label, children, className }) {
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
export function ActivityCardsSkeleton({ count = 6 }) {
    return (
        <SkeletonStatus
            label="Loading activities..."
            className={activityGridClass}
        >
            {Array.from({ length: count }, (_, index) => (
                <div className={cardClass} key={index}>
                    <SkeletonBlock className="mb-5 h-[180px] rounded-lg" />
                    <SkeletonBlock className="mb-3.5 h-[22px] w-[70%]" />
                    <SkeletonBlock className="mb-2.5 h-3.5" />
                    <SkeletonBlock className="mb-2.5 h-3.5 w-3/5" />
                </div>
            ))}
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
                    className="flex gap-3 border-b border-[#e5e5e5] p-4 last:border-b-0"
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

// Contact cards: the same stacked cards as the real Contact Us list.
export function ContactCardsSkeleton({ count = 3 }) {
    return (
        <SkeletonStatus
            label="Loading contacts..."
            className="flex flex-col gap-3"
        >
            {Array.from({ length: count }, (_, index) => (
                <div className={contactItemClass} key={index}>
                    <SkeletonBlock className="mb-3 h-[18px] w-[60%]" />
                    <SkeletonBlock className="mb-2.5 h-3.5 w-1/2" />
                    <SkeletonBlock className="h-3.5" />
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
                    <SkeletonBlock className="mb-3.5 h-[30px] w-[55%]" />

                    <div className="mb-6 flex gap-2">
                        <SkeletonBlock className="h-7 w-[90px] rounded-[14px]" />
                        <SkeletonBlock className="h-7 w-[90px] rounded-[14px]" />
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
