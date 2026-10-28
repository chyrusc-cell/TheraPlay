import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from './api.js';
import { ActivityDetailsSkeleton } from './Skeleton.jsx';
import { difficultyBadgeClass } from './uiHelpers.js';
import './css/ActivityDetails.css';

const API_URL = 'http://127.0.0.1:8000/api';

// The token is saved by Login.jsx in either localStorage or sessionStorage.
const getToken = () =>
    localStorage.getItem('theraplay_token') ||
    sessionStorage.getItem('theraplay_token');

// Is this activity already completed for the logged-in parent? It reads the
// saved progress from the server, so the answer survives refreshes and new
// logins. Guests and failures count as "not completed" and never claim a
// completion that was not saved.
const fetchIsCompleted = async (activityId, signal) => {
    if (!getToken()) {
        return false;
    }

    try {
        const result = await apiRequest('/progress', { signal });

        if (!result.ok) {
            return false;
        }

        const records = result.data.data?.records;

        return (
            Array.isArray(records) &&
            records.some(
                (record) =>
                    String(record.activity_id) === String(activityId) &&
                    record.status === 'completed'
            )
        );
    } catch (error) {
        if (error.name === 'AbortError') {
            throw error;
        }

        return false;
    }
};

function ActivityDetails() {

    const { activityId } = useParams();
    const navigate = useNavigate();

    const [activity, setActivity] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [message, setMessage] = useState('');
    const [isMessageError, setIsMessageError] = useState(false);

    const [showChildForm, setShowChildForm] = useState(false);
    const [childName, setChildName] = useState('');
    const [childError, setChildError] = useState('');

    const [downloadingId, setDownloadingId] = useState(null);
    const [downloadError, setDownloadError] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        const loadActivity = async () => {
            try {
                setIsLoading(true);
                setError('');
                setNotFound(false);

                const [response, completed] = await Promise.all([
                    fetch(`${API_URL}/activities/${activityId}`, {
                        headers: { Accept: 'application/json' },
                        signal: controller.signal,
                    }),
                    fetchIsCompleted(activityId, controller.signal),
                ]);

                if (response.status === 404) {
                    setNotFound(true);
                    return;
                }

                if (!response.ok) {
                    throw new Error('Unable to load this activity.');
                }

                const result = await response.json();
                setActivity(result.data);
                setIsCompleted(completed);
                setMessage('');
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

        loadActivity();

        return () => controller.abort();
    }, [activityId]);

    // Token missing or rejected: clear it and send the user to login.
    const redirectToLogin = (text) => {
        ['theraplay_token', 'theraplay_user'].forEach((key) => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        navigate('/login', { state: { message: text } });
    };

    // Asks the backend to save the completion. Returns true only when the
    // backend confirms it was saved.
    const completeActivity = async (token) => {
        const response = await fetch(
            `${API_URL}/activities/${activityId}/complete`,
            {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        if (response.status === 401) {
            redirectToLogin('Your session has expired. Please log in again.');
            return false;
        }

        const data = await response.json().catch(() => ({}));

        // The parent has no child profile yet: ask for the child's name.
        if (data.code === 'child_profile_required') {
            setShowChildForm(true);
            return false;
        }

        if (!response.ok) {
            throw new Error(
                data.message ||
                'Unable to save your progress. Please try again.'
            );
        }

        setShowChildForm(false);
        setIsCompleted(true);
        setMessage(data.message || 'Activity marked as completed.');
        return true;
    };

    const handleComplete = async () => {
        if (isSubmitting || isCompleted) {
            return;
        }

        const token = getToken();

        if (!token) {
            redirectToLogin('Please log in to mark activities as completed.');
            return;
        }

        setIsSubmitting(true);
        setMessage('');
        setIsMessageError(false);

        try {
            await completeActivity(token);
        } catch (err) {
            setIsMessageError(true);
            setMessage(
                err.message ||
                'Unable to connect to the server. Please try again.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChildSubmit = async (event) => {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        const name = childName.trim();

        if (!name) {
            setChildError("Please enter your child's name.");
            return;
        }

        const token = getToken();

        if (!token) {
            redirectToLogin('Please log in to mark activities as completed.');
            return;
        }

        setIsSubmitting(true);
        setChildError('');
        setMessage('');
        setIsMessageError(false);

        try {
            const response = await fetch(`${API_URL}/children`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ name }),
            });

            if (response.status === 401) {
                redirectToLogin('Your session has expired. Please log in again.');
                return;
            }

            const data = await response.json().catch(() => ({}));

            // A child profile that already exists is fine: just continue.
            if (!response.ok && data.code !== 'child_profile_exists') {
                // The typed name stays in the form so it can be corrected.
                setChildError(
                    data.errors?.name?.[0] ||
                    data.message ||
                    "Unable to save your child's profile. Please try again."
                );
                return;
            }

            // Child profile is ready: hide the form and retry the completion.
            setShowChildForm(false);
            setChildName('');

            try {
                await completeActivity(token);
            } catch (err) {
                setIsMessageError(true);
                setMessage(
                    err.message ||
                    'Your child profile was saved, but the activity could not be completed. Please try again.'
                );
            }
        } catch {
            setChildError('Unable to connect to the server. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChildCancel = () => {
        setShowChildForm(false);
        setChildName('');
        setChildError('');
    };

    // Files of a published activity are fetched and handed to the browser as
    // a download, so a failure can be shown instead of opening an error page.
    const handleDownload = async (resource) => {
        if (downloadingId !== null) {
            return;
        }

        setDownloadError('');
        setDownloadingId(resource.id);

        try {
            const response = await fetch(
                `${API_URL}/activities/${activityId}/resources/${resource.id}/download`
            );

            if (!response.ok) {
                throw new Error(
                    response.status === 404
                        ? 'This file is no longer available.'
                        : 'Unable to download this file. Please try again.'
                );
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = resource.file_name;
            document.body.appendChild(link);
            link.click();
            link.remove();

            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            setDownloadError(
                err.message ||
                'Unable to connect to the server. Please try again.'
            );
        } finally {
            setDownloadingId(null);
        }
    };


    if (isLoading) {

        return (
            <div className="activity-details-page">
                <main className="activity-details-content">
                    <ActivityDetailsSkeleton />
                </main>
            </div>
        );

    }


    if (error) {

        return (
            <div className="activity-not-found">

                <h1>
                    Something Went Wrong
                </h1>

                <p role="alert">
                    {error}
                </p>

                <Link to="/activities">
                    Back to Activities
                </Link>

            </div>
        );

    }


    if (notFound || !activity) {

        return (
            <div className="activity-not-found">

                <h1>
                    Activity Not Found
                </h1>

                <p>
                    The activity you are looking for does not exist.
                </p>

                <Link to="/activities">
                    Back to Activities
                </Link>

            </div>
        );

    }


    return (
        <div className="activity-details-page">

            {/* Main Content */}

            <main className="activity-details-content">

                <Link
                    to="/activities"
                    className="back-link"
                >
                    ← Back to Activities
                </Link>


                <div className="activity-details-card">

                    {/* Activity Image */}

                    <div className="activity-details-image">
                        Image
                    </div>


                    {/* Activity Information */}

                    <div className="activity-information">

                        <h1>
                            {activity.title}
                        </h1>

                        <div className="activity-tags">

                            {activity.category && (
                                <span>
                                    {activity.category}
                                </span>
                            )}

                            <span className={difficultyBadgeClass(activity.difficulty)}>
                                {activity.difficulty}
                            </span>

                        </div>


                        {/* Objective */}

                        <section className="details-section">

                            <h2>
                                Objective
                            </h2>

                            <p>
                                {activity.objective}
                            </p>

                        </section>


                        {/* Instructions */}

                        <section className="details-section">

                            <h2>
                                Instructions
                            </h2>

                            <ol>

                                {activity.instructions.map(
                                    (instruction, index) => (

                                        <li key={index}>
                                            {instruction}
                                        </li>

                                    )
                                )}

                            </ol>

                        </section>


                        {/* Materials */}

                        <section className="details-section">

                            <h2>
                                Materials
                            </h2>

                            <ul>

                                {activity.materials.map(
                                    (material, index) => (

                                        <li key={index}>
                                            {material}
                                        </li>

                                    )
                                )}

                            </ul>


                            {/* Uploaded files (only shown when there are some) */}

                            {Array.isArray(activity.resources) &&
                                activity.resources.length > 0 && (

                                <ul className="resource-list">

                                    {activity.resources.map((resource) => (

                                        <li key={resource.id}>

                                            <button
                                                type="button"
                                                className="resource-button"
                                                onClick={() =>
                                                    handleDownload(resource)
                                                }
                                                disabled={downloadingId !== null}
                                            >
                                                {downloadingId === resource.id
                                                    ? 'Downloading...'
                                                    : `Download ${resource.file_name}`}
                                            </button>

                                        </li>

                                    ))}

                                </ul>

                            )}

                            {downloadError && (
                                <p role="alert" className="resource-error">
                                    {downloadError}
                                </p>
                            )}

                        </section>


                        {showChildForm && (
                            <form
                                className="child-form"
                                onSubmit={handleChildSubmit}
                            >
                                <h2>
                                    Add Your Child
                                </h2>

                                <p>
                                    Your child's name is needed to record
                                    completed activities.
                                </p>

                                <label htmlFor="childName">
                                    Child's name
                                </label>

                                <input
                                    id="childName"
                                    type="text"
                                    value={childName}
                                    onChange={(e) => setChildName(e.target.value)}
                                    maxLength={255}
                                    disabled={isSubmitting}
                                    required
                                />

                                {childError && (
                                    <p
                                        role="alert"
                                        className="child-form-error"
                                    >
                                        {childError}
                                    </p>
                                )}

                                <div className="child-form-actions">
                                    <button
                                        type="button"
                                        className="child-form-cancel"
                                        onClick={handleChildCancel}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className="complete-button"
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting
                                            ? 'Saving...'
                                            : 'Save and Complete'}
                                    </button>
                                </div>
                            </form>
                        )}

                        <button
                            className="complete-button"
                            onClick={handleComplete}
                            disabled={isSubmitting || isCompleted || showChildForm}
                        >
                            {isSubmitting
                                ? 'Saving...'
                                : isCompleted
                                    ? 'Completed'
                                    : 'Mark as Completed'}
                        </button>

                        {message && (
                            <p
                                role="alert"
                                style={{
                                    color: isMessageError ? '#d93025' : '#188038',
                                    marginTop: '12px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                }}
                            >
                                {message}
                            </p>
                        )}

                    </div>

                </div>

            </main>

        </div>
    );
}

export default ActivityDetails;