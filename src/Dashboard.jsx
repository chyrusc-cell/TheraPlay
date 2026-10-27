import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './css/Dashboard.css';

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
            <div className="dashboard-page">
                <main className="dashboard-content">
                    <p className="dashboard-status">Loading your dashboard...</p>
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-page">
                <main className="dashboard-content">
                    <p className="dashboard-status dashboard-error" role="alert">
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
        <div className="dashboard-page">

            <main className="dashboard-content">

                <header className="dashboard-header">
                    <h1>Hello, {user?.name}!</h1>
                    <p>We provide a range of resources and guidance to support their physical, cognitive, emotional, and social growth.</p>
                    <span className="date-subtitle">Week of {formatWeekRange(weekStart)}</span>
                </header>

                <div className="dashboard-top-grid">
                    <div className="card">
                        <div className="card-header-border">
                            <h3>Continue / Recommended Activity</h3>
                        </div>
                        <div className="card-body">
                            {featured ? (
                                <>
                                    <div className="activity-title-row">
                                        <h2>{featured.title}</h2>
                                    </div>
                                    <p className="card-desc">
                                        {featured.description ||
                                            'Explore this activity and its learning objectives.'}
                                    </p>
                                    <button
                                        className="btn-primary"
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
                                <p className="card-desc">
                                    No activities are available right now.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header-border">
                            <h3>Streak</h3>
                        </div>
                        <div className="card-body">
                            <div className="streak-header">
                                <div className="streak-count">
                                    <h2>{streak}</h2>
                                    <span>Day practice streak</span>
                                </div>
                            </div>
                            <p className="streak-date">This week • {formatWeekRange(weekStart)}</p>

                            <div className="streak-days">
                                {DAY_LETTERS.map((letter, index) => (
                                    <div
                                        className={`day${
                                            completedDayKeys.has(weekKeys[index])
                                                ? ' active'
                                                : ''
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

                <div className="card full-width-card">
                    <div className="card-header-border">
                        <h3>Summary of Progress</h3>
                    </div>
                    <div className="card-body progress-body">
                        <div className="progress-stats">
                            <div className="stat-box">
                                <span className="stat-label">Activities this week</span>
                                <h2>{completedThisWeek}</h2>
                                <span className="stat-sub">completed this week</span>
                            </div>
                            <div className="stat-box">
                                <span className="stat-label">Skills practiced</span>
                                <h2>{skills.length}</h2>
                                <span className="stat-sub">
                                    {skills.length > 0
                                        ? skills.join(', ')
                                        : 'No completed activities yet'}
                                </span>
                            </div>
                        </div>
                        <div className="progress-footer">
                            <Link to="/progress" className="view-report-link">
                                View detailed progress report
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                    <polyline points="12 5 19 12 12 19"></polyline>
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="card full-width-card">
                    <div className="card-header-flex">
                        <h3>Recent Activities</h3>
                        <Link to="/activities" className="view-all-link">View all</Link>
                    </div>
                    <div className="recent-list">

                        {recent.length === 0 ? (
                            <p className="dashboard-status">
                                No activity yet. Completed activities will appear here.
                            </p>
                        ) : (
                            recent.map((record) => {
                                const isDone = record.status === 'completed';
                                const when = isDone
                                    ? record.completed_at
                                    : record.started_at;

                                return (
                                    <div className="recent-item" key={record.id}>
                                        <div className="item-left">
                                            {isDone ? (
                                                <div className="icon-circle completed">
                                                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                </div>
                                            ) : (
                                                <div className="icon-circle in-progress">
                                                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                                </div>
                                            )}
                                            <div className="item-text">
                                                <h4>{record.activity_title || 'Activity'}</h4>
                                                {when && <span>{formatDate(when)}</span>}
                                            </div>
                                        </div>
                                        <span
                                            className={`list-tag ${
                                                isDone ? 'tag-completed' : 'tag-progress'
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
