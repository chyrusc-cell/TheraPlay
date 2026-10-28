import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CardsSkeleton } from './Skeleton.jsx';
import { holdSkeleton } from './minLoading.js';

const API_URL = 'http://127.0.0.1:8000/api';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// The token is saved by Login.jsx in either localStorage or sessionStorage.
const getToken = () =>
    localStorage.getItem('theraplay_token') ||
    sessionStorage.getItem('theraplay_token');

// "2026-10-21" in the viewer's local time (same convention as Progress.jsx).
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

const formatWeekRange = (weekStart) => {
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

    return `${startText}-${endText}, ${weekEnd.getFullYear()}`;
};

const formatDate = (value) => {
    const date = new Date(value);
    const text = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });

    return `${text} • ${date.getFullYear()}`;
};

// Streak rule: consecutive days with at least one completed activity,
// counting back from today. If nothing was completed today yet, the streak
// can still continue from yesterday.
const getCurrentStreak = (completedDayKeys) => {
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    if (!completedDayKeys.has(dayKey(cursor))) {
        cursor.setDate(cursor.getDate() - 1);
    }

    let streak = 0;

    while (completedDayKeys.has(dayKey(cursor))) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
};

// Card look as currently rendered (the old global .card rule was merged from the
// Dashboard, Progress and Profile stylesheets).
const cardClass =
    'mb-6 overflow-hidden rounded-xl border border-[#eaeaea] bg-white p-[30px] shadow-[0_2px_10px_rgba(0,0,0,0.02)]';
const cardHeaderClass = 'border-b border-[#f0f0f0] px-6 py-4';
const cardHeaderFlexClass =
    'flex items-center justify-between border-b border-[#f0f0f0] px-6 py-4';
const cardTitleClass = 'text-[15px] font-bold text-[#333]';
const cardBodyClass = 'px-6 pt-5 pb-6';
const statusClass = 'text-[14px] font-medium text-muted';
const iconCircleClass =
    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#ddd] bg-white text-[#333]';

function Dashboard() {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [records, setRecords] = useState([]);
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // Token missing or rejected: clear it and send the user to login.
        const redirectToLogin = () => {
            ['theraplay_token', 'theraplay_user'].forEach((key) => {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            });

            navigate('/login', {
                replace: true,
                state: { message: 'Please log in to view your dashboard.' },
            });
        };

        const token = getToken();

        if (!token) {
            redirectToLogin();
            return;
        }

        const controller = new AbortController();

        const startedAt = performance.now();

        const authHeaders = {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
        };

        const loadDashboard = async () => {
            try {
                const [userResponse, progressResponse, activitiesResponse] =
                    await Promise.all([
                        fetch(`${API_URL}/user`, {
                            headers: authHeaders,
                            signal: controller.signal,
                        }),
                        fetch(`${API_URL}/progress`, {
                            headers: authHeaders,
                            signal: controller.signal,
                        }),
                        fetch(`${API_URL}/activities`, {
                            headers: { Accept: 'application/json' },
                            signal: controller.signal,
                        }),
                    ]);

                if (
                    userResponse.status === 401 ||
                    progressResponse.status === 401
                ) {
                    redirectToLogin();
                    return;
                }

                if (
                    !userResponse.ok ||
                    !progressResponse.ok ||
                    !activitiesResponse.ok
                ) {
                    throw new Error('Unable to load your dashboard.');
                }

                const userData = await userResponse.json();
                const progressData = await progressResponse.json();
                const activitiesData = await activitiesResponse.json();

                setUser(userData);
                setRecords(
                    Array.isArray(progressData.data?.records)
                        ? progressData.data.records
                        : []
                );
                setActivities(
                    Array.isArray(activitiesData.data)
                        ? activitiesData.data
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

                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        loadDashboard();

        return () => controller.abort();
    }, [navigate]);

    if (isLoading) {
        return (
            <div className="flex min-h-page flex-col">
                <main className="mx-auto w-full max-w-[1000px] px-5 pt-10 pb-20">
                    <CardsSkeleton label="Loading your dashboard..." cards={3} />
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-page flex-col">
                <main className="mx-auto w-full max-w-[1000px] px-5 pt-10 pb-20">
                    <p className="text-[14px] font-medium text-[#d93025]" role="alert">
                        {error}
                    </p>
                </main>
            </div>
        );
    }

    // --- Values calculated from the stored records ---
    const completed = records.filter(
        (r) => r.status === 'completed' && r.completed_at
    );
    const completedDayKeys = new Set(
        completed.map((r) => dayKey(new Date(r.completed_at)))
    );

    const weekStart = getWeekStart();
    const weekKeys = DAY_LETTERS.map((_, index) => {
        const day = new Date(weekStart);
        day.setDate(day.getDate() + index);
        return dayKey(day);
    });

    const completedThisWeek = completed.filter((r) =>
        weekKeys.includes(dayKey(new Date(r.completed_at)))
    ).length;

    const streak = getCurrentStreak(completedDayKeys);

    const skills = [
        ...new Set(completed.map((r) => r.category).filter(Boolean)),
    ];

    // Continue: an in-progress activity if there is one, otherwise suggest
    // the first published activity that has not been completed yet.
    const publishedById = new Map(activities.map((a) => [a.id, a]));
    const completedIds = new Set(completed.map((r) => r.activity_id));

    const inProgressRecord = records.find(
        (r) => r.status === 'in_progress' && publishedById.has(r.activity_id)
    );

    const featured = inProgressRecord
        ? publishedById.get(inProgressRecord.activity_id)
        : activities.find((a) => !completedIds.has(a.id)) || activities[0];

    const recent = records.slice(0, 3);

    return (
        <div className="flex min-h-page flex-col">

            <main className="mx-auto w-full max-w-[1000px] px-5 pt-10 pb-20">

                <header className="mb-8">
                    <h1 className="mb-2 text-[32px] font-bold text-ink">Hello, {user?.name}!</h1>
                    <p className="mb-4 text-[15px] font-medium text-muted">We provide a range of resources and guidance to support their physical, cognitive, emotional, and social growth.</p>
                    <span className="text-[12px] font-medium text-[#888]">Week of {formatWeekRange(weekStart)}</span>
                </header>

                <div className="mb-6 grid grid-cols-2 gap-6 tablet-sm:grid-cols-1">
                    <div className={cardClass}>
                        <div className={cardHeaderClass}>
                            <h3 className={cardTitleClass}>Continue / Recommended Activity</h3>
                        </div>
                        <div className={cardBodyClass}>
                            {featured ? (
                                <>
                                    <div className="mb-3 flex items-center justify-between">
                                        <h2 className="text-[20px] font-bold text-ink">{featured.title}</h2>
                                    </div>
                                    <p className="mb-5 text-[14px] leading-[1.5] text-[#666]">
                                        {featured.description ||
                                            'Explore this activity and its learning objectives.'}
                                    </p>
                                    <button
                                        className="cursor-pointer rounded-md border-0 bg-primary px-5 py-2.5 [font-family:inherit] text-[14px] font-bold text-white enabled:hover:bg-primary-hover"
                                        type="button"
                                        onClick={() =>
                                            navigate(`/activities/${featured.id}`)
                                        }
                                    >
                                        {inProgressRecord
                                            ? 'Continue activity'
                                            : 'Start activity'}
                                    </button>
                                </>
                            ) : (
                                <p className="mb-5 text-[14px] leading-[1.5] text-[#666]">
                                    No activities are available right now.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className={cardClass}>
                        <div className={cardHeaderClass}>
                            <h3 className={cardTitleClass}>Streak</h3>
                        </div>
                        <div className={cardBodyClass}>
                            <div className="mb-4 flex items-start justify-between">
                                <div>
                                    <h2 className="text-[28px] leading-none font-bold text-ink">{streak}</h2>
                                    <span className="text-[13px] font-medium text-muted">Day practice streak</span>
                                </div>
                            </div>
                            <p className="mb-3 text-[12px] font-medium text-[#888]">This week • {formatWeekRange(weekStart)}</p>

                            <div className="flex gap-2">
                                {DAY_LETTERS.map((letter, index) => (
                                    <div
                                        className={`flex-1 rounded-md py-2 text-center text-[13px] font-bold ${
                                            completedDayKeys.has(weekKeys[index])
                                                ? 'bg-[#404040] text-white'
                                                : 'bg-[#f0f0f0] text-[#999]'
                                        }`}
                                        key={weekKeys[index]}
                                    >
                                        {letter}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={cardClass}>
                    <div className={cardHeaderClass}>
                        <h3 className={cardTitleClass}>Summary of Progress</h3>
                    </div>
                    <div className={cardBodyClass}>
                        <div className="mb-5 flex gap-4 tablet-sm:flex-col">
                            <div className="flex-1 rounded-lg bg-[#f9f9f9] p-5">
                                <span className="mb-2 block text-[13px] font-medium text-muted">Activities this week</span>
                                <h2 className="mb-1 text-[24px] font-bold text-ink">{completedThisWeek}</h2>
                                <span className="text-[12px] text-[#888]">completed this week</span>
                            </div>
                            <div className="flex-1 rounded-lg bg-[#f9f9f9] p-5">
                                <span className="mb-2 block text-[13px] font-medium text-muted">Skills practiced</span>
                                <h2 className="mb-1 text-[24px] font-bold text-ink">{skills.length}</h2>
                                <span className="text-[12px] text-[#888]">
                                    {skills.length > 0
                                        ? skills.join(', ')
                                        : 'No completed activities yet'}
                                </span>
                            </div>
                        </div>
                        <div className="border-t border-[#f0f0f0] pt-4">
                            <Link to="/progress" className="flex items-center justify-between text-[13px] font-bold text-[#333] no-underline">
                                View detailed progress report
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                    <polyline points="12 5 19 12 12 19"></polyline>
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>

                <div className={cardClass}>
                    <div className={cardHeaderFlexClass}>
                        <h3 className={cardTitleClass}>Recent Activities</h3>
                        <Link to="/activities" className="text-[13px] font-bold text-muted no-underline">View all</Link>
                    </div>
                    <div className="p-5">

                        {recent.length === 0 ? (
                            <p className={statusClass}>
                                No activity yet. Completed activities will appear here.
                            </p>
                        ) : (
                            recent.map((record) => {
                                const isDone = record.status === 'completed';
                                const when = isDone
                                    ? record.completed_at
                                    : record.started_at;

                                return (
                                    <div className="mb-3 flex items-center justify-between rounded-lg bg-[#f9f9f9] p-4 last:mb-0" key={record.id}>
                                        <div className="flex items-center gap-4">
                                            {isDone ? (
                                                <div className={iconCircleClass}>
                                                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                </div>
                                            ) : (
                                                <div className={iconCircleClass}>
                                                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="mb-1 text-[14px] font-bold text-ink">{record.activity_title || 'Activity'}</h4>
                                                {when && <span className="text-[12px] text-[#888]">{formatDate(when)}</span>}
                                            </div>
                                        </div>
                                        <span
                                            className={`rounded-xl px-2.5 py-1 text-[11px] font-bold ${
                                                isDone
                                                    ? 'bg-[#eee] text-[#333]'
                                                    : 'border border-[#ddd] bg-[#f5f5f5] text-muted'
                                            }`}
                                        >
                                            {isDone
                                                ? 'Completed'
                                                : record.status === 'in_progress'
                                                    ? 'In Progress'
                                                    : 'Not Started'}
                                        </span>
                                    </div>
                                );
                            })
                        )}

                    </div>
                </div>

            </main>
        </div>
    );
}

export default Dashboard;
