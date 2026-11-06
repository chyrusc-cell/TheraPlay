import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, clearSession } from './api.js';
import { StarDisplay } from './StarRating.jsx';
import { LinesSkeleton } from './Skeleton.jsx';
import { holdSkeleton } from './minLoading.js';
import { formatSessionDate } from './journalFormat.js';

const PER_PAGE = 10;

const cardClass = 'rounded-[10px] border border-edge bg-white card-soft p-[25px] phone:p-4';
const pillClass =
    'cursor-pointer rounded-xl border btn-glass btn-white px-4 py-2 text-[13px] text-ink enabled:hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60';

/*
 * Admin dashboard: the parents' session ratings and journal notes, newest first,
 * ten per page (GET /api/admin/activity-feedback). Read-only: an admin cannot edit
 * what a parent wrote. Only names, the activity, the rating, the note and dates
 * are shown (no email addresses).
 */
function ActivityFeedbackSection() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);
    const [entries, setEntries] = useState([]);
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        const startedAt = performance.now();

        (async () => {
            try {
                setLoading(true);
                setError('');

                const result = await apiRequest(`/admin/activity-feedback?page=${page}&per_page=${PER_PAGE}`, {
                    signal: controller.signal,
                });

                if (result.status === 401) {
                    clearSession();
                    navigate('/login', { replace: true, state: { message: 'Please log in to continue.' } });
                    return;
                }

                if (!result.ok || !Array.isArray(result.data?.data)) {
                    throw new Error('Unable to load activity feedback.');
                }

                setEntries(result.data.data);
                setMeta(result.data.meta || { current_page: page, last_page: 1, total: result.data.data.length });
            } catch (err) {
                if (err.name === 'AbortError') {
                    return;
                }

                setError(err.message || 'Unable to connect to the server. Please try again.');
            } finally {
                await holdSkeleton(startedAt, controller.signal);

                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        })();

        return () => controller.abort();
    }, [page, reloadKey, navigate]);

    return (
        <section className={`${cardClass} mt-5`} aria-labelledby="activity-feedback-heading" data-testid="activity-feedback">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="activity-feedback-heading" className="text-[18px] font-bold">
                    Activity Feedback
                </h2>
                {!loading && !error && meta.total > 0 && (
                    <p className="text-[13px] text-faint">
                        {meta.total} {meta.total === 1 ? 'entry' : 'entries'}
                    </p>
                )}
            </div>

            {loading ? (
                <LinesSkeleton label="Loading activity feedback..." lines={4} />
            ) : error ? (
                <div role="alert">
                    <p className="mb-5 text-[13px] text-[#d93025]">{error}</p>
                    <button type="button" className={pillClass} onClick={() => setReloadKey((key) => key + 1)}>
                        Try again
                    </button>
                </div>
            ) : entries.length === 0 ? (
                <p className="text-[13px] text-faint">
                    No activity feedback yet. Ratings and notes appear here when parents complete an activity
                    and write about the session.
                </p>
            ) : (
                <>
                    <ul className="m-0 flex list-none flex-col p-0">
                        {entries.map((entry) => (
                            <li key={entry.id} className="border-t border-edge py-4 first:border-t-0 first:pt-0">
                                <p className="mb-1 text-[14px] font-bold [overflow-wrap:anywhere]">
                                    {entry.user ? entry.user.name : 'Former user'}
                                </p>

                                <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <p className="text-[14px] font-bold text-body [overflow-wrap:anywhere]">
                                        {entry.activity ? entry.activity.title : 'Removed activity'}
                                    </p>
                                    <span className="text-faint" aria-hidden="true">|</span>
                                    <StarDisplay value={entry.rating} />
                                </div>

                                <p className="mb-2 text-[12px] text-faint">
                                    {entry.child ? `Child: ${entry.child.name} · ` : ''}
                                    <time dateTime={entry.session_completed_at}>
                                        Session {formatSessionDate(entry.session_completed_at)}
                                    </time>
                                </p>

                                {entry.note ? (
                                    <p className="max-h-[180px] overflow-y-auto whitespace-pre-wrap pr-1 text-[14px] leading-[1.6] text-body [overflow-wrap:anywhere]">
                                        {entry.note}
                                    </p>
                                ) : (
                                    <p className="text-[13px] italic text-faint">No note was written for this session.</p>
                                )}
                            </li>
                        ))}
                    </ul>

                    {meta.last_page > 1 && (
                        <nav className="mt-4 flex items-center justify-between gap-3" aria-label="Activity feedback pages">
                            <button
                                type="button"
                                className={pillClass}
                                onClick={() => setPage((value) => Math.max(1, value - 1))}
                                disabled={page <= 1}
                            >
                                Newer
                            </button>
                            <span className="text-[13px] text-muted" role="status">
                                Page {meta.current_page} of {meta.last_page}
                            </span>
                            <button
                                type="button"
                                className={pillClass}
                                onClick={() => setPage((value) => Math.min(meta.last_page, value + 1))}
                                disabled={page >= meta.last_page}
                            >
                                Older
                            </button>
                        </nav>
                    )}
                </>
            )}
        </section>
    );
}

export default ActivityFeedbackSection;
