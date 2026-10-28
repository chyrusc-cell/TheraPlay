import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CardsSkeleton } from './Skeleton.jsx';
import './css/Progress.css';

const API_URL = 'http://127.0.0.1:8000/api';

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

function Progress() {
    const navigate = useNavigate();

    const [records, setRecords] = useState([]);
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
                state: { message: 'Please log in to view your progress.' },
            });
        };

        const token = getToken();

        if (!token) {
            redirectToLogin();
            return;
        }

        const controller = new AbortController();

        const loadProgress = async () => {
            try {
                const response = await fetch(`${API_URL}/progress`, {
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
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        loadProgress();

        return () => controller.abort();
    }, [navigate]);

    if (isLoading) {
        return (
            <div className="progress-page">
                <main className="progress-content">
                    <CardsSkeleton label="Loading your progress..." cards={3} />
                </main>
            </div>
        );
    }

    if (error) {
        return (
            <div className="progress-page">
                <main className="progress-content">
                    <p className="progress-status progress-error" role="alert">
                        {error}
                    </p>
                </main>
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
        <div className="progress-page">
            <main className="progress-content">
                <div className="progress-header">
                    <h1>My Progress</h1>
                </div>

                <div className="progress-sub-header">
                    <button className="dropdown-button" type="button">
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
                        <span className="sample-data-text">
                            No activity has been recorded yet.
                        </span>
                    )}
                </div>

                {/* 2-Column Grid Layout */}
                <div className="progress-grid">
                    {/* Left Column */}
                    <div className="grid-col-left">
                        {/* Weekly Participation Card */}
                        <div className="card">
                            <div className="card-header">
                                <h3>Weekly Participation</h3>
                            </div>

                            <div className="card-body">
                                <div className="participation-stats">
                                    <div className="stat-left">
                                        <h2>{completedThisWeek}</h2>
                                        <span>activities completed this week</span>
                                    </div>

                                    <div className="stat-right">
                                        <h2>{completionRate}%</h2>
                                        <span>of started activities completed</span>
                                    </div>
                                </div>

                                <div className="progress-bar-container large-bar">
                                    <div
                                        className="progress-bar-fill monochrome-fill"
                                        style={{ width: `${completionRate}%` }}
                                    ></div>
                                </div>

                                <div className="participation-boxes">
                                    <div className="sub-box">
                                        <span className="box-label">
                                            Active days this week
                                        </span>
                                        <span className="box-value">
                                            {activeDays}
                                        </span>
                                    </div>

                                    <div className="sub-box">
                                        <span className="box-label">
                                            Longest streak
                                        </span>
                                        <span className="box-value">
                                            {longestStreak}{' '}
                                            {longestStreak === 1 ? 'day' : 'days'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Skills Practiced Card */}
                        <div className="card">
                            <div className="card-header border-bottom">
                                <h3>Skills Practiced</h3>
                            </div>

                            <div className="card-body">
                                {skills.length === 0 ? (
                                    <p className="progress-status">
                                        No completed activities yet.
                                    </p>
                                ) : (
                                    skills.map(([name, count]) => {
                                        const percent = Math.round(
                                            (count / completed.length) * 100
                                        );

                                        return (
                                            <div className="skill-item" key={name}>
                                                <div className="skill-info">
                                                    <span>{name}</span>
                                                    <span className="skill-stat">
                                                        {count}{' '}
                                                        {count === 1
                                                            ? 'activity'
                                                            : 'activities'}{' '}
                                                        • {percent}%
                                                    </span>
                                                </div>
                                                <div className="progress-bar-container">
                                                    <div
                                                        className="progress-bar-fill monochrome-fill"
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
                    <div className="grid-col-right">
                        {/* Activity Trend Card */}
                        <div className="card">
                            <div className="card-header border-bottom">
                                <h3>Activity Trend</h3>
                            </div>

                            <div className="card-body">
                                <div className="trend-header">
                                    <span>Activities completed per day</span>
                                    <span className="total-tag">
                                        {completedThisWeek} total
                                    </span>
                                </div>

                                <div className="bar-chart-container">
                                    {DAY_LABELS.map((label, index) => (
                                        <div className="chart-bar-group" key={label}>
                                            <div
                                                className={`bar ${
                                                    dailyCounts[index] > 0
                                                        ? 'monochrome-bar'
                                                        : 'empty-bar'
                                                }`}
                                                style={{
                                                    height: `${
                                                        (dailyCounts[index] / maxDaily) * 100
                                                    }%`,
                                                }}
                                            ></div>
                                            <span>
                                                {label} • {dailyCounts[index]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Recent Activity Card */}
                        <div className="card">
                            <div className="card-header border-bottom">
                                <h3>Recent Activity</h3>
                            </div>

                            <div className="card-body">
                                <div className="goal-header">
                                    <div className="goal-text">
                                        <h2>{completed.length}</h2>
                                        <span>activities completed in total</span>
                                    </div>
                                </div>

                                <h4 className="milestone-title">
                                    Latest activity
                                </h4>

                                <div className="milestone-list">
                                    {recent.length === 0 ? (
                                        <p className="progress-status">
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
                                                    className="milestone-item"
                                                    key={record.id}
                                                >
                                                    <div
                                                        className={`icon-circle${
                                                            isDone ? ' completed' : ''
                                                        }`}
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

                                                    <div className="milestone-text">
                                                        <h5>
                                                            {record.activity_title ||
                                                                'Activity'}
                                                        </h5>
                                                        <p>
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
            </main>
        </div>
    );
}

export default Progress;
