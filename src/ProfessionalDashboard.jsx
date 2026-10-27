import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest, clearSession } from './api.js';
import './css/ProfessionalDashboard.css';

// The API returns every feedback entry (there is no pagination yet), so the
// dashboard only shows the newest few. Nothing is hidden on the server.
const FEEDBACK_LIMIT = 5;

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
                if (!controller.signal.aborted) {
                    setFeedbackLoading(false);
                }
            }
        };

        loadFeedback();

        return () => controller.abort();
    }, [feedbackReloadKey, navigate]);


    const retryFeedback = () => {
        setFeedbackLoading(true);
        setFeedbackError('');
        setFeedbackReloadKey((key) => key + 1);
    };


    // The API returns newest first. Only the activity list is available to
    // the dashboard, so only figures calculated from it are shown.
    const recentUploads = activities.slice(0, 4);


    return (
        <div className="professional-dashboard-page">

            {/* Main Content */}

            <main className="professional-dashboard-content">

                <div className="dashboard-header">

                    <h1>
                        Dashboard
                    </h1>

                    <p>
                        Overview of your TheraPlay activities and users.
                    </p>

                </div>


                {error && (
                    <p className="panel-note error" role="alert">
                        {error}
                    </p>
                )}


                {/* Statistics */}

                <section className="statistics-grid">

                    <div className="stat-card">

                        <div className="stat-number">
                            {isLoading || error ? '—' : activities.length}
                        </div>

                        <div className="stat-label">
                            Total Activities
                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-number">
                            —
                        </div>

                        <div className="stat-label">
                            Total Users
                        </div>

                        <div className="stat-note">
                            Not available yet
                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-number">
                            —
                        </div>

                        <div className="stat-label">
                            Completed Activities
                        </div>

                        <div className="stat-note">
                            Not available yet
                        </div>

                    </div>

                </section>


                {/* Dashboard Sections */}

                <section className="dashboard-sections">

                    {/* Activity Progress */}

                    <div className="dashboard-panel">

                        <h2>
                            Activity Progress Overview
                        </h2>

                        <p className="panel-note">
                            Progress statistics are not available yet.
                        </p>

                    </div>


                    {/* Recent Uploads */}

                    <div className="dashboard-panel">

                        <div className="panel-header">

                            <h2>
                                Recent Activity Uploads
                            </h2>

                            <Link to="/manage-activities">
                                View All
                            </Link>

                        </div>


                        <div className="recent-uploads">

                            {isLoading && (
                                <p className="panel-note">
                                    Loading activities...
                                </p>
                            )}

                            {!isLoading && !error && recentUploads.length === 0 && (
                                <p className="panel-note">
                                    No activities yet.
                                </p>
                            )}

                            {recentUploads.map((item) => (

                                <div
                                    className="upload-item"
                                    key={item.id}
                                >

                                    <div className="upload-image">
                                        Image
                                    </div>

                                    <div className="upload-info">

                                        <h3>
                                            {item.title}
                                        </h3>

                                        <p>
                                            {item.category || 'No category'}
                                            {' • '}
                                            {item.is_published
                                                ? 'Published'
                                                : 'Draft'}
                                        </p>

                                    </div>

                                    <div className="upload-date">
                                        {formatDate(item.created_at)}
                                    </div>

                                </div>

                            ))}

                        </div>

                    </div>

                </section>


                {/* Feedback from parents */}

                <section className="feedback-section">

                    <div className="dashboard-panel">

                        <h2>
                            Parent Feedback
                        </h2>

                        {feedbackLoading ? (

                            <p className="panel-note">
                                Loading feedback...
                            </p>

                        ) : feedbackError ? (

                            <div role="alert">

                                <p className="panel-note error">
                                    {feedbackError}
                                </p>

                                <button
                                    type="button"
                                    className="feedback-retry"
                                    onClick={retryFeedback}
                                >
                                    Try again
                                </button>

                            </div>

                        ) : feedback.length === 0 ? (

                            <p className="panel-note">
                                No feedback has been submitted yet.
                            </p>

                        ) : (

                            <>

                                <div className="feedback-list">

                                    {feedback.slice(0, FEEDBACK_LIMIT).map((item) => (

                                        <div
                                            className="feedback-item"
                                            key={item.id}
                                        >

                                            <div className="feedback-meta">

                                                <span className="feedback-author">
                                                    {item.user
                                                        ? `${item.user.name} (${item.user.email})`
                                                        : 'Former user'}
                                                </span>

                                                <span className="feedback-date">
                                                    {formatDate(item.created_at)}
                                                </span>

                                            </div>

                                            {item.rating && (
                                                <div className="feedback-rating">
                                                    Rating: {item.rating} / 5
                                                </div>
                                            )}

                                            <p className="feedback-message">
                                                {item.message}
                                            </p>

                                        </div>

                                    ))}

                                </div>

                                {feedback.length > FEEDBACK_LIMIT && (
                                    <p className="panel-note">
                                        Showing the latest {FEEDBACK_LIMIT} of{' '}
                                        {feedback.length} feedback entries.
                                    </p>
                                )}

                            </>

                        )}

                    </div>

                </section>

            </main>

        </div>
    );
}

export default ProfessionalDashboard;
