import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CardsSkeleton } from './Skeleton.jsx';
import { useChildGate } from './useChildGate.jsx';
import { holdSkeleton } from './minLoading.js';
import { pageMain, pageHeader, pageTitle } from './uiClasses.js';
import { API_URL } from './api.js';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// The token is saved by Login.jsx in either localStorage or sessionStorage.
const getToken = () =>
    localStorage.getItem('theraplay_token') ||
    sessionStorage.getItem('theraplay_token');

// "2026-10-21" in the viewer's local time, used to group records by day.
const dayKey = (date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
};

// Monday of the current week, at midnight local time.
const getWeekStart = () => {
    const today = new Date();
    const start = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    return start;
};

const formatWeekLabel = (weekStart) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const startText = weekStart.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
    const endText =
        weekStart.getMonth() === weekEnd.getMonth()
            ? String(weekEnd.getDate())
            : weekEnd.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
              });

    return `Week of ${startText}-${endText}, ${weekEnd.getFullYear()}`;
};

const formatDate = (value) =>
    new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

// Longest run of consecutive days that have at least one completed activity.
const getLongestStreak = (completed) => {
    const days = [
        ...new Set(completed.map((r) => dayKey(new Date(r.completed_at)))),
    ].sort();

    let longest = 0;
    let current = 0;
    let previous = null;

    days.forEach((key) => {
        const [y, m, d] = key.split('-').map(Number);
        const date = new Date(y, m - 1, d);

        if (previous) {
            const next = new Date(previous);
            next.setDate(next.getDate() + 1);
            current = dayKey(next) === key ? current + 1 : 1;
        } else {
            current = 1;
        }

        longest = Math.max(longest, current);
        previous = date;
    });

    return longest;
};

// Card look as currently rendered (the old global .card rule was merged from the
// Dashboard, Progress and Profile stylesheets).
const cardClass =
    'mb-6 overflow-hidden rounded-xl border border-edge bg-white p-[30px] shadow-[0_2px_10px_rgba(0,0,0,0.02)]';
const cardHeaderClass = 'px-6 pt-5 pb-2.5';
const cardHeaderRuleClass = 'border-b border-edge px-6 pt-5 pb-5';
const cardTitleClass = 'text-[16px] font-bold text-ink';
const cardBodyClass = 'px-6 pt-5 pb-6';
const statusClass = 'text-[14px] font-medium text-muted';
const bigNumberClass = 'text-[28px] leading-[1.2] font-bold text-ink';
const bigLabelClass = 'text-[13px] font-medium text-muted';
const barTrackClass = 'h-2 w-full overflow-hidden rounded-lg bg-sunken';
const barFillClass = 'h-full rounded-lg bg-accent';
const iconCircleClass =
    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-edge-strong bg-white text-ink';

function Progress() {
    const navigate = useNavigate();
    // Everything here is for the globally selected child.
    const { selectedChildId, selectedChild, childStatus, authStatus, isParent, waiting, blocked } = useChildGate();
    // The child whose load has FINISHED, whether it worked or failed. (It says
    // "a result, or an error, is on screen for this child"; whether the data
    // arrived is the separate `error` state.)
    const [settledChildId, setSettledChildId] = useState(undefined);

    const [records, setRecords] = useState([]);
    const [isLoadingNow, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // The selection changed but its load has not finished: show the skeleton, not
    // the previous child's progress.
    // Not a parent (an admin, or a login that could not be verified): there is no
    // child's progress to load, so nothing is requested and nothing waits.
    const noChildData = !waiting && !isParent;
    const isLoading =
        !noChildData &&
        (isLoadingNow || (childStatus === 'ready' && settledChildId !== selectedChildId));

    useEffect(() => {
        if (waiting || childStatus === 'error' || (childStatus === 'ready' && !selectedChildId)) {
            return;
        }

        // Token missing or rejected: clear it and send the user to login.
        const redirectToLogin = () => {
            ['theraplay_token', 'theraplay_user'].forEach((key) => {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            });

            navigate('/login', {
                replace: true,
                state: { message: 'Please log in to view your progress.' },
            });
        };

        const token = getToken();

        if (!token) {
            redirectToLogin();
            return;
        }

        // Progress belongs to a parent's child. The login is verified by now
        // (waiting is over), so anyone else (an admin, or a login the server could
        // not verify) makes no request at all (see noChildData below).
        if (!isParent) {
            return;
        }

        const controller = new AbortController();

        const startedAt = performance.now();

        const loadProgress = async () => {
            try {
                setIsLoading(true);
                setError('');

                const response = await fetch(`${API_URL}/progress${selectedChildId ? `?child_id=${selectedChildId}` : ""}`, {
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    signal: controller.signal,
                });

                if (response.status === 401) {
                    redirectToLogin();
                    return;
                }

                if (!response.ok) {
                    throw new Error('Unable to load your progress.');
                }

                const result = await response.json();

                // A newer load (another child) has taken over: drop this answer.
                if (controller.signal.aborted) {
                    return;
                }

                setRecords(
                    Array.isArray(result.data?.records)
                        ? result.data.records
                        : []
                );
            } catch (err) {
                if (err.name === 'AbortError') {
                    return;
                }

                setError(
                    err.message ||
                    'Unable to connect to the server. Please try again.'
                );
            } finally {
                await holdSkeleton(startedAt, controller.signal);

                // The load is over (worked or failed): show the result or the error.
                if (!controller.signal.aborted) {
                    setSettledChildId(selectedChildId);
                    setIsLoading(false);
                }
            }
        };

        loadProgress();

        return () => controller.abort();
    }, [navigate, waiting, childStatus, selectedChildId, isParent]);

    if (blocked) {
        return (
            <div className="flex min-h-page flex-col">
                <div className={pageMain}>{blocked}</div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex min-h-page flex-col">
                <div className={pageMain}>
                    <CardsSkeleton label="Loading your progress..." cards={3} />
                </div>
            </div>
        );
    }

    const shownError =
        noChildData && authStatus === 'error'
            ? 'We could not verify your account. Please try again.'
            : error;

    if (shownError) {
        return (
            <div className="flex min-h-page flex-col">
                <div className={pageMain}>
                    <p className="text-[14px] font-medium text-[#d93025]" role="alert">
                        {shownError}
                    </p>
                </div>
            </div>
        );
    }

    // --- Summaries calculated from the stored records ---
    const completed = records.filter(
        (r) => r.status === 'completed' && r.completed_at
    );
    const attempted = records.filter(
        (r) => r.status === 'completed' || r.status === 'in_progress'
    );

    const weekStart = getWeekStart();
    const weekKeys = DAY_LABELS.map((_, index) => {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + index);
        return dayKey(day);
    });

    const dailyCounts = weekKeys.map(
        (key) =>
            completed.filter(
                (r) => dayKey(new Date(r.completed_at)) === key
            ).length
    );

    const completedThisWeek = dailyCounts.reduce((sum, n) => sum + n, 0);
    const activeDays = dailyCounts.filter((n) => n > 0).length;
    const maxDaily = Math.max(...dailyCounts, 1);
    const completionRate = attempted.length
        ? Math.round((completed.length / attempted.length) * 100)
        : 0;
    const longestStreak = getLongestStreak(completed);

    const skillCounts = {};
    completed.forEach((r) => {
        const name = r.category || 'Uncategorized';
        skillCounts[name] = (skillCounts[name] || 0) + 1;
    });
    const skills = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]);

    const recent = records.slice(0, 5);

    return (
        <div className="flex min-h-page flex-col">
            <div className={pageMain}>
                <div className={pageHeader}>
                    <h1 className={pageTitle}>My Progress</h1>
                    {selectedChild && (
                        <p className="mt-2 text-[15px] font-medium text-muted">
                            Progress for {selectedChild.name}
                        </p>
                    )}
                </div>

                <div className="mb-[30px] flex items-center justify-between">
                    <button className="flex cursor-pointer items-center gap-2 rounded-[20px] border border-edge-strong btn-glass px-4 py-2 [font-family:inherit] text-[13px] font-medium text-ink" type="button">
                        {formatWeekLabel(weekStart)}
                        <svg
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                        >
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>

                    {records.length === 0 && (
                        <span className="text-[13px] font-medium text-faint">
                            No activity has been recorded yet.
                        </span>
                    )}
                </div>

                {/* 2-Column Grid Layout */}
                <div className="grid grid-cols-2 gap-6 tablet:grid-cols-1">
                    {/* Left Column */}
                    <div className="flex flex-col gap-6">
                        {/* Weekly Participation Card */}
                        <div className={cardClass}>
                            <div className={cardHeaderClass}>
                                <h2 className={cardTitleClass}>Weekly Participation</h2>
                            </div>

                            <div className={cardBodyClass}>
                                <div className="mb-4 flex items-end justify-between">
                                    <div>
                                        <p className={bigNumberClass}>{completedThisWeek}</p>
                                        <span className={bigLabelClass}>activities completed this week</span>
                                    </div>

                                    <div className="text-right">
                                        <p className={bigNumberClass}>{completionRate}%</p>
                                        <span className={bigLabelClass}>of started activities completed</span>
                                    </div>
                                </div>

                                <div className="mb-6 h-3 w-full overflow-hidden rounded-lg bg-sunken">
                                    <div
                                        className={barFillClass}
                                        style={{ width: `${completionRate}%` }}
                                    ></div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex flex-1 flex-col gap-1 rounded-lg bg-warm p-4">
                                        <span className="text-[12px] font-medium text-muted">
                                            Active days this week
                                        </span>
                                        <span className="text-[18px] font-bold text-ink">
                                            {activeDays}
                                        </span>
                                    </div>

                                    <div className="flex flex-1 flex-col gap-1 rounded-lg bg-warm p-4">
                                        <span className="text-[12px] font-medium text-muted">
                                            Longest streak
                                        </span>
                                        <span className="text-[18px] font-bold text-ink">
                                            {longestStreak}{' '}
                                            {longestStreak === 1 ? 'day' : 'days'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Skills Practiced Card */}
                        <div className={cardClass}>
                            <div className={cardHeaderRuleClass}>
                                <h2 className={cardTitleClass}>Skills Practiced</h2>
                            </div>

                            <div className={cardBodyClass}>
                                {skills.length === 0 ? (
                                    <p className={statusClass}>
                                        No completed activities yet.
                                    </p>
                                ) : (
                                    skills.map(([name, count]) => {
                                        const percent = Math.round(
                                            (count / completed.length) * 100
                                        );

                                        return (
                                            <div className="mb-5 last:mb-0" key={name}>
                                                <div className="mb-2 flex items-center justify-between text-[14px] font-medium text-ink">
                                                    <span>{name}</span>
                                                    <span className="text-[12px] font-bold text-muted">
                                                        {count}{' '}
                                                        {count === 1
                                                            ? 'activity'
                                                            : 'activities'}{' '}
                                                        • {percent}%
                                                    </span>
                                                </div>
                                                <div className={barTrackClass}>
                                                    <div
                                                        className={barFillClass}
                                                        style={{ width: `${percent}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="flex flex-col gap-6">
                        {/* Activity Trend Card */}
                        <div className={cardClass}>
                            <div className={cardHeaderRuleClass}>
                                <h2 className={cardTitleClass}>Activity Trend</h2>
                            </div>

                            <div className={cardBodyClass}>
                                <div className="mb-[30px] flex items-center justify-between text-[13px] font-medium text-muted">
                                    <span>Activities completed per day</span>
                                    <span className="rounded-xl bg-sunken px-2.5 py-1 text-[11px] font-bold text-ink">
                                        {completedThisWeek} total
                                    </span>
                                </div>

                                <div className="flex h-40 items-end justify-between pt-5">
                                    {DAY_LABELS.map((label, index) => (
                                        <div className="flex h-full flex-col items-center justify-end gap-3" key={label}>
                                            <div
                                                className={`w-6 rounded-t-md ${
                                                    dailyCounts[index] > 0
                                                        ? 'bg-accent-2'
                                                        : 'bg-transparent'
                                                }`}
                                                style={{
                                                    height: `${
                                                        (dailyCounts[index] / maxDaily) * 100
                                                    }%`,
                                                }}
                                            ></div>
                                            <span className="text-[11px] font-medium text-muted">
                                                {label} • {dailyCounts[index]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Card */}
                        <div className={cardClass}>
                            <div className={cardHeaderRuleClass}>
                                <h2 className={cardTitleClass}>Recent Activity</h2>
                            </div>

                            <div className={cardBodyClass}>
                                <div className="mb-4 flex items-start justify-between">
                                    <div>
                                        <p className="text-[24px] leading-[1.2] font-bold text-ink">{completed.length}</p>
                                        <span className={bigLabelClass}>activities completed in total</span>
                                    </div>
                                </div>

                                <p className="mb-4 text-[13px] font-medium text-muted">
                                    Latest activity
                                </p>

                                <div className="flex flex-col gap-3">
                                    {recent.length === 0 ? (
                                        <p className={statusClass}>
                                            Activities you start or complete will
                                            appear here.
                                        </p>
                                    ) : (
                                        recent.map((record) => {
                                            const isDone =
                                                record.status === 'completed';
                                            const when = isDone
                                                ? record.completed_at
                                                : record.started_at;

                                            return (
                                                <div
                                                    className="flex items-start gap-3 rounded-lg bg-warm p-4"
                                                    key={record.id}
                                                >
                                                    <div
                                                        className={iconCircleClass}
                                                    >
                                                        {isDone && (
                                                            <svg
                                                                viewBox="0 0 24 24"
                                                                width="14"
                                                                height="14"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                fill="none"
                                                            >
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <h3 className="mb-1 text-[13px] font-bold text-ink">
                                                            {record.activity_title ||
                                                                'Activity'}
                                                        </h3>
                                                        <p className="text-[12px] leading-[1.4] font-medium text-muted">
                                                            {isDone
                                                                ? 'Completed'
                                                                : 'In progress'}
                                                            {when &&
                                                                ` • ${formatDate(when)}`}
                                                            {record.category &&
                                                                ` • ${record.category}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Progress;
