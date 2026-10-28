// Small loading placeholders. They show the SHAPE of what is loading, never
// fake data, and are announced to screen readers as a single "loading" status.
// Styles live in css/ui.css (the shimmer stops with prefers-reduced-motion).

function SkeletonStatus({ label, children, className }) {
    return (
        <div
            className={className}
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <span className="sr-only">{label}</span>
            <div aria-hidden="true" style={{ display: 'contents' }}>
                {children}
            </div>
        </div>
    );
}

// A single block. Give it a class (skeleton-line, skeleton-title, ...) or size.
export function SkeletonBlock({ className = '', style }) {
    return <span className={`skeleton ${className}`} style={style} />;
}

// Activity cards: same grid and card shell as the real list.
export function ActivityCardsSkeleton({ count = 6 }) {
    return (
        <SkeletonStatus
            label="Loading activities..."
            className="activities-grid"
        >
            {Array.from({ length: count }, (_, index) => (
                <div className="skeleton-card" key={index}>
                    <SkeletonBlock className="skeleton-image" />
                    <SkeletonBlock className="skeleton-title" />
                    <SkeletonBlock className="skeleton-line" />
                    <SkeletonBlock className="skeleton-line short" />
                </div>
            ))}
        </SkeletonStatus>
    );
}

// Admin tables: keeps the real header, shows rows where data will appear.
export function TableSkeleton({ label, columns, rows = 5 }) {
    return (
        <SkeletonStatus label={label} className="activities-table-container">
            <table className="activities-table">
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th key={column}>{column}</th>
                        ))}
                    </tr>
                </thead>
            </table>

            {Array.from({ length: rows }, (_, index) => (
                <div className="skeleton-row" key={index}>
                    {columns.map((column) => (
                        <SkeletonBlock key={column} />
                    ))}
                </div>
            ))}
        </SkeletonStatus>
    );
}

// Contact cards: same grid and card shell as the real Contact Us list.
export function ContactCardsSkeleton({ count = 3 }) {
    return (
        <SkeletonStatus
            label="Loading contacts..."
            className="contact-grid"
        >
            {Array.from({ length: count }, (_, index) => (
                <div className="contact-card" key={index}>
                    <SkeletonBlock className="skeleton-title" />
                    <SkeletonBlock className="skeleton-line short" />
                    <SkeletonBlock className="skeleton-line" />
                    <SkeletonBlock className="skeleton-line" />
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
                    className={`skeleton-line${index % 2 ? ' short' : ''}`}
                />
            ))}
        </SkeletonStatus>
    );
}

// Activity details: the same two-column card as the real page.
export function ActivityDetailsSkeleton() {
    return (
        <SkeletonStatus label="Loading activity...">
            <div className="activity-details-card">
                <SkeletonBlock
                    className="skeleton-image"
                    style={{ height: 220, marginBottom: 0 }}
                />

                <div>
                    <SkeletonBlock
                        className="skeleton-title"
                        style={{ height: 30, width: '55%' }}
                    />

                    <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                        <SkeletonBlock className="skeleton-pill" />
                        <SkeletonBlock className="skeleton-pill" />
                    </div>

                    <SkeletonBlock className="skeleton-line" />
                    <SkeletonBlock className="skeleton-line" />
                    <SkeletonBlock className="skeleton-line short" />

                    <SkeletonBlock
                        className="skeleton-line"
                        style={{ marginTop: 24 }}
                    />
                    <SkeletonBlock className="skeleton-line" />
                    <SkeletonBlock className="skeleton-line short" />
                </div>
            </div>
        </SkeletonStatus>
    );
}

// Generic page placeholder: a heading and a few cards.
export function CardsSkeleton({ label, cards = 2 }) {
    return (
        <SkeletonStatus label={label}>
            <SkeletonBlock
                className="skeleton-title"
                style={{ width: '40%', height: 32, marginBottom: 24 }}
            />
            {Array.from({ length: cards }, (_, index) => (
                <div
                    className="skeleton-card"
                    style={{ marginBottom: 24 }}
                    key={index}
                >
                    <SkeletonBlock className="skeleton-title" />
                    <SkeletonBlock className="skeleton-line" />
                    <SkeletonBlock className="skeleton-line" />
                    <SkeletonBlock className="skeleton-line short" />
                </div>
            ))}
        </SkeletonStatus>
    );
}
