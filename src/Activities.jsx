import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { apiRequest, clearSession, getToken } from './api.js';
import { ActivityCardsSkeleton } from './Skeleton.jsx';
import { difficultyBadgeClass } from './uiHelpers.js';
import './css/Activities.css';

// Which activities has the logged-in parent completed? This reads the same
// saved progress as the Progress page. Guests, expired logins and failures
// simply mean "nothing completed"; they never mark anything as completed.
const loadCompletedIds = async (signal) => {
    if (!getToken()) {
        return { completedIds: new Set(), failed: false };
    }

    try {
        const result = await apiRequest('/progress', { signal });

        if (result.status === 401) {
            clearSession();
            return { completedIds: new Set(), failed: false };
        }

        if (!result.ok) {
            return { completedIds: new Set(), failed: true };
        }

        const records = Array.isArray(result.data.data?.records)
            ? result.data.data.records
            : [];

        return {
            completedIds: new Set(
                records
                    .filter((record) => record.status === 'completed')
                    .map((record) => record.activity_id)
            ),
            failed: false,
        };
    } catch (err) {
        if (err.name === 'AbortError') {
            throw err;
        }

        return { completedIds: new Set(), failed: true };
    }
};

function Activities() {
    const [activities, setActivities] = useState([]);
    const [completedIds, setCompletedIds] = useState(new Set());
    const [progressFailed, setProgressFailed] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        const fetchActivities = async () => {
            try {
                setIsLoading(true);
                setError('');

                // Both are loaded before anything is shown, so the cards do
                // not appear in one order and then jump into another.
                const [response, progress] = await Promise.all([
                    fetch('http://127.0.0.1:8000/api/activities', {
                        headers: {
                            Accept: 'application/json',
                        },
                        signal: controller.signal,
                    }),
                    loadCompletedIds(controller.signal),
                ]);

                if (!response.ok) {
                    throw new Error('Unable to load activities.');
                }

                const result = await response.json();

                setActivities(
                    Array.isArray(result.data) ? result.data : []
                );
                setCompletedIds(progress.completedIds);
                setProgressFailed(progress.failed);
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

        fetchActivities();

        return () => controller.abort();
    }, []);

    // Not completed first, completed last. Each group keeps the order the
    // server sent, and every activity appears exactly once.
    const orderedActivities = useMemo(
        () => [
            ...activities.filter((activity) => !completedIds.has(activity.id)),
            ...activities.filter((activity) => completedIds.has(activity.id)),
        ],
        [activities, completedIds]
    );

    return (
        <div className="activities-page">

            {/* Main Content */}
            <main className="activities-content">
                <div className="activities-header">
                    <h1>Activities</h1>
                    <p>
                        Explore activities designed to help develop
                        different skills.
                    </p>
                </div>

                {/* Activity Cards Grid */}
                {isLoading ? (
                    <ActivityCardsSkeleton />
                ) : error ? (
                    <p
                        className="activities-status activities-error"
                        role="alert"
                    >
                        {error}
                    </p>
                ) : activities.length === 0 ? (
                    <p className="activities-status">
                        No activities are available right now.
                    </p>
                ) : (
                    <>
                    {progressFailed && (
                        <p className="activities-status activities-note">
                            We could not load your completion status, so
                            completed activities are not marked right now.
                        </p>
                    )}

                    <div className="activities-grid">
                        {orderedActivities.map((activity) => (
                            <div
                                className="activity-card"
                                key={activity.id}
                            >
                                <div className="activity-image-wrapper">
                                    <div
                                        className={`activity-image img-placeholder-${
                                            ((activity.id - 1) % 6) + 1
                                        }`}
                                    ></div>
                                </div>

                                <div className="activity-info">
                                    <div className="activity-badges">
                                        {activity.difficulty && (
                                            <span
                                                className={difficultyBadgeClass(
                                                    activity.difficulty
                                                )}
                                            >
                                                {activity.difficulty}
                                            </span>
                                        )}

                                        {completedIds.has(activity.id) && (
                                            <span className="activity-completed-tag">
                                                ✓ Completed
                                            </span>
                                        )}
                                    </div>

                                    <h2>{activity.title}</h2>

                                    <p className="activity-desc">
                                        {activity.description ||
                                            'Explore this activity and its learning objectives.'}
                                    </p>

                                    <Link
                                        to={`/activities/${activity.id}`}
                                        className="activity-link"
                                        aria-label={`View activity: ${activity.title}`}
                                    >
                                        View Activity
                                        <svg
                                            viewBox="0 0 24 24"
                                            width="16"
                                            height="16"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            fill="none"
                                        >
                                            <line
                                                x1="5"
                                                y1="12"
                                                x2="19"
                                                y2="12"
                                            />
                                            <polyline
                                                points="12 5 19 12 12 19"
                                            />
                                        </svg>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                    </>
                )}
            </main>
        </div>
    );
}

export default Activities;