import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './css/Activities.css';

function Activities() {
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                setIsLoading(true);
                setError('');

                const response = await fetch(
                    'http://127.0.0.1:8000/api/activities',
                    {
                        headers: {
                            Accept: 'application/json',
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error('Unable to load activities.');
                }

                const result = await response.json();

                setActivities(
                    Array.isArray(result.data) ? result.data : []
                );
            } catch (err) {
                setError(
                    err.message ||
                    'Unable to connect to the server. Please try again.'
                );
            } finally {
                setIsLoading(false);
            }
        };

        fetchActivities();
    }, []);

    return (
        <div className="activities-page">
            {/* Navigation Bar */}
            <nav className="navbar">
                {/* Keep your existing navbar JSX here */}
            </nav>

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
                    <p className="activities-status">
                        Loading activities...
                    </p>
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
                    <div className="activities-grid">
                        {activities.map((activity) => (
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
                                    <h2>{activity.title}</h2>

                                    <p className="activity-desc">
                                        {activity.description ||
                                            'Explore this activity and its learning objectives.'}
                                    </p>

                                    <Link
                                        to={`/activities/${activity.id}`}
                                        className="activity-link"
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
                )}
            </main>
        </div>
    );
}

export default Activities;