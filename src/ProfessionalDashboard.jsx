import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest, clearSession } from './api.js';
import { SkeletonBlock, LinesSkeleton } from './Skeleton.jsx';
import { holdSkeleton } from './minLoading.js';
import { pageMain, pageHeader, pageTitle, pageSubtitle } from './uiClasses.js';

// The API returns every feedback entry (there is no pagination yet), so the
// dashboard only shows the newest few. Nothing is hidden on the server.
const FEEDBACK_LIMIT = 5;

// Class strings used more than once on this page. Colors and breakpoints come
// from css/tailwind.css; the focus ring is the global one in css/ui.css.
const cardClass = 'rounded-[10px] border border-[#e1e5ea] bg-white p-[25px]';
const noteClass = 'text-[13px] text-[#888]';
const noteErrorClass = 'mb-5 text-[13px] text-[#d93025]';

const API_URL = 'http://127.0.0.1:8000/api';

// The token is saved by Login.jsx in either localStorage or sessionStorage.
const getToken = () =>
    localStorage.getItem('theraplay_token') ||
    sessionStorage.getItem('theraplay_token');

const formatDate = (value) =>
    value
        ? new Date(value).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
          })
        : '';

function ProfessionalDashboard() {

    const navigate = useNavigate();

    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [feedback, setFeedback] = useState([]);
    const [feedbackLoading, setFeedbackLoading] = useState(true);
    const [feedbackError, setFeedbackError] = useState('');
    const [feedbackReloadKey, setFeedbackReloadKey] = useState(0);

    // Number of accounts, counted from the admin accounts list. null = unknown.
    const [userCount, setUserCount] = useState(null);
    const [usersLoading, setUsersLoading] = useState(true);
    const [usersError, setUsersError] = useState('');
    const [usersReloadKey, setUsersReloadKey] = useState(0);

    useEffect(() => {
        const redirectToLogin = () => {
            ['theraplay_token', 'theraplay_user'].forEach((key) => {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            });

            navigate('/login', {
                replace: true,
                state: { message: 'Please log in to continue.' },
            });
        };

        const token = getToken();

        if (!token) {
            redirectToLogin();
            return;
        }

        const controller = new AbortController();

        const startedAt = performance.now();

        const loadActivities = async () => {
            try {
                const response = await fetch(`${API_URL}/admin/activities`, {
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
                    throw new Error('Unable to load dashboard data.');
                }

                const result = await response.json();

                setActivities(Array.isArray(result.data) ? result.data : []);
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

        loadActivities();

        return () => controller.abort();
    }, [navigate]);


    // Submitted feedback (newest first, as returned by the API).
    useEffect(() => {
        const controller = new AbortController();
        const startedAt = performance.now();

        const loadFeedback = async () => {
            try {
                const result = await apiRequest('/admin/feedback', {
                    signal: controller.signal,
                });

                if (result.status === 401) {
                    clearSession();
                    navigate('/login', {
                        replace: true,
                        state: { message: 'Please log in to continue.' },
                    });
                    return;
                }

                if (!result.ok) {
                    throw new Error('Unable to load feedback.');
                }

                setFeedback(
                    Array.isArray(result.data.data) ? result.data.data : []
                );
                setFeedbackError('');
            } catch (err) {
                if (err.name === 'AbortError') {
                    return;
                }

                setFeedbackError(
                    err.message ||
                    'Unable to connect to the server. Please try again.'
                );
            } finally {
                await holdSkeleton(startedAt, controller.signal);

                if (!controller.signal.aborted) {
                    setFeedbackLoading(false);
                }
            }
        };

        loadFeedback();

        return () => controller.abort();
    }, [feedbackReloadKey, navigate]);


    // The accounts list (admin only) is the source of truth for the user count.
    // There is no status or soft-delete column, so every account record counts.
    useEffect(() => {
        const controller = new AbortController();
        const startedAt = performance.now();

        const loadUsers = async () => {
            try {
                const result = await apiRequest('/admin/users', {
                    signal: controller.signal,
                });

                if (result.status === 401) {
                    clearSession();
                    navigate('/login', {
                        replace: true,
                        state: { message: 'Please log in to continue.' },
                    });
                    return;
                }

                if (!result.ok || !Array.isArray(result.data?.data)) {
                    throw new Error('Unable to load the account count.');
                }

                setUserCount(result.data.data.length);
                setUsersError('');
            } catch (err) {
                if (err.name === 'AbortError') {
                    return;
                }

                setUserCount(null);
                setUsersError(
                    err.message ||
                    'Unable to connect to the server. Please try again.'
                );
            } finally {
                await holdSkeleton(startedAt, controller.signal);

                if (!controller.signal.aborted) {
                    setUsersLoading(false);
                }
            }
        };

        loadUsers();

        return () => controller.abort();
    }, [usersReloadKey, navigate]);


    const retryUsers = () => {
        setUsersLoading(true);
        setUsersError('');
        setUsersReloadKey((key) => key + 1);
    };


    const retryFeedback = () => {
        setFeedbackLoading(true);
        setFeedbackError('');
        setFeedbackReloadKey((key) => key + 1);
    };


    // The API returns newest first. Only the activity list is available to
    // the dashboard, so only figures calculated from it are shown.
    const recentUploads = activities.slice(0, 4);


    return (
        <div className="min-h-page bg-[#f5f7fa]">

            {/* Main Content */}

            <main className={pageMain}>

                <div className={pageHeader}>

                    <h1 className={pageTitle}>
                        Dashboard
                    </h1>

                    <p className={pageSubtitle}>
                        Overview of your TheraPlay activities and users.
                    </p>

                </div>


                {error && (
                    <p className={noteErrorClass} role="alert">
                        {error}
                    </p>
                )}


                {/*
                  Two columns: the statistics and the recent uploads on the left,
                  the parent feedback on the right, as tall as the left column
                  (the right column adds no height of its own on desktop: the
                  card fills it and its list scrolls). Stacked on tablets and
                  phones.
                */}

                <div className="grid grid-cols-2 items-stretch gap-5 tablet:grid-cols-1">

                    {/* Left column */}

                    <div className="flex min-w-0 flex-col gap-5">

                        {/* Statistics */}

                        <section className="grid grid-cols-2 gap-5 phone:grid-cols-1">

                        <div className={cardClass}>

                            <div className="mb-[5px] text-[30px] font-bold">
                                {isLoading ? (
                                    <>
                                        <SkeletonBlock
                                            style={{ width: 56, height: 32, margin: '0 auto' }}
                                        />
                                        <span className="sr-only">
                                            Loading total activities
                                        </span>
                                    </>
                                ) : error ? '—' : activities.length}
                            </div>

                            <div className="text-[14px] text-[#666]">
                                Total Activities
                            </div>

                        </div>


                        <div className={cardClass}>

                            <div className="mb-[5px] text-[30px] font-bold">
                                {usersLoading ? (
                                    <>
                                        <SkeletonBlock
                                            style={{ width: 56, height: 32, margin: '0 auto' }}
                                        />
                                        <span className="sr-only">
                                            Loading total users
                                        </span>
                                    </>
                                ) : usersError ? '—' : userCount}
                            </div>

                            <div className="text-[14px] text-[#666]">
                                Total Users
                            </div>

                            {usersError && !usersLoading && (
                                <div className="mt-1 text-[13px] text-[#d93025]" role="alert">
                                    {usersError}{' '}
                                    <button
                                        type="button"
                                        onClick={retryUsers}
                                        className="cursor-pointer border-0 bg-transparent p-0 [font-family:inherit] text-[13px] font-bold text-[#333] underline"
                                    >
                                        Try again
                                    </button>
                                </div>
                            )}

                        </div>

                        </section>


                        {/* Recent Uploads */}

    <div className={`${cardClass} min-w-0 flex-1`}>

                            <div className="mb-5 flex items-center justify-between">

                                <h2 className="text-[18px] font-bold">
                                    Recent Activity Uploads
                                </h2>

                                <Link
                                    to="/manage-activities"
                                    className="text-[13px] font-bold text-[#333] no-underline"
                                >
                                    View All
                                </Link>

                            </div>


                            <div className="flex flex-col">

                                {isLoading && (
                                    <LinesSkeleton
                                        label="Loading recent activities..."
                                        lines={4}
                                    />
                                )}

                                {!isLoading && !error && recentUploads.length === 0 && (
                                    <p className={noteClass}>
                                        No activities yet.
                                    </p>
                                )}

                                {recentUploads.map((item) => (

                                    <div
                                        className="grid grid-cols-[50px_1fr_auto] items-center gap-3 border-t border-[#e5e5e5] py-3 first:border-t-0 phone:grid-cols-[50px_1fr]"
                                        key={item.id}
                                    >

                                        <div className="flex h-10 w-[50px] items-center justify-center rounded-[5px] bg-[#e9eef3] text-[10px] text-[#8a96a3]">
                                            Image
                                        </div>

                                        <div>

                                            <h3 className="mb-1 text-[14px] font-bold">
                                                {item.title}
                                            </h3>

                                            <p className="text-[12px] text-[#777]">
                                                {item.category || 'No category'}
                                                {' • '}
                                                {item.is_published
                                                    ? 'Published'
                                                    : 'Draft'}
                                            </p>

                                        </div>

                                        <div className="text-[11px] text-[#888] phone:col-start-2">
                                            {formatDate(item.created_at)}
                                        </div>

                                    </div>

                                ))}

                            </div>

                        </div>

                    </div>


                    {/* Right column: feedback from parents */}

                    <section className="relative min-h-[320px] min-w-0 tablet:static tablet:min-h-0">

    <div className={`${cardClass} absolute inset-0 flex flex-col tablet:relative tablet:max-h-[520px]`}>

                            <h2 className="mb-[25px] shrink-0 text-[18px] font-bold">
                                Parent Feedback
                            </h2>

                            {feedbackLoading ? (

                                <LinesSkeleton label="Loading feedback..." lines={5} />

                            ) : feedbackError ? (

                                <div role="alert">

                                    <p className={noteErrorClass}>
                                        {feedbackError}
                                    </p>

                                    <button
                                        type="button"
                                        className="cursor-pointer rounded-md border border-[#ccc] bg-white px-4 py-2 text-[13px] text-[#333] enabled:hover:bg-hover"
                                        onClick={retryFeedback}
                                    >
                                        Try again
                                    </button>

                                </div>

                            ) : feedback.length === 0 ? (

                                <p className={noteClass}>
                                    No feedback has been submitted yet.
                                </p>

                            ) : (

                                <div className="flex min-h-0 flex-1 flex-col">

                                    <div className="min-h-0 flex-1 overflow-y-auto pr-1">

                                        {feedback.slice(0, FEEDBACK_LIMIT).map((item) => (

                                            <div
                                                className="border-b border-[#e5e5e5] py-3.5 first:pt-0 last:border-b-0"
                                                key={item.id}
                                            >

                                                <div className="mb-1.5 flex justify-between gap-3 phone:flex-col phone:gap-0.5">

                                                    <span className="text-[13px] font-bold [word-break:break-word]">
                                                        {item.user
                                                            ? `${item.user.name} (${item.user.email})`
                                                            : 'Former user'}
                                                    </span>

                                                    <span className="shrink-0 text-[12px] text-[#888]">
                                                        {formatDate(item.created_at)}
                                                    </span>

                                                </div>

                                                {item.rating && (
                                                    <div className="mb-1.5 text-[12px] text-[#666]">
                                                        Rating: {item.rating} / 5
                                                    </div>
                                                )}

                                                <p className="text-[14px] leading-[1.5] whitespace-pre-wrap text-[#444] [word-break:break-word]">
                                                    {item.message}
                                                </p>

                                            </div>

                                        ))}

                                    </div>

                                    {feedback.length > FEEDBACK_LIMIT && (
                                        <p className={`${noteClass} mt-3 shrink-0`}>
                                            Showing the latest {FEEDBACK_LIMIT} of{' '}
                                            {feedback.length} feedback entries.
                                        </p>
                                    )}

                                </div>

                            )}

                        </div>

                    </section>

                </div>

            </main>

        </div>
    );
}

export default ProfessionalDashboard;
