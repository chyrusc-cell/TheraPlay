import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { apiRequest, clearSession, getToken } from './api.js';
import { ActivityCardsSkeleton } from './Skeleton.jsx';
import ActivityPicture from './ActivityPicture.jsx';
import { holdSkeleton } from './minLoading.js';
import { difficultyBadgeTw } from './uiHelpers.js';
import { activityGridClass } from './uiClasses.js';

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

// Soft background for the card image area, picked by activity id. Written as
// a lookup so Tailwind can see every class name (it cannot read names that are
// built from pieces).
const imagePlaceholders = [
    'bg-[#e3f2fd]',
    'bg-[#fbe9e7]',
    'bg-[#fce4ec]',
    'bg-[#f3e5f5]',
    'bg-[#e8f5e9]',
    'bg-[#fff8e1]',
];

const cardClass =
    'flex flex-col rounded-2xl border border-[#eaeaea] bg-white p-5 shadow-[0_4px_15px_rgba(0,0,0,0.02)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(0,0,0,0.06)] motion-reduce:hover:translate-y-0';

const statusClass = 'px-5 py-10 text-center text-[15px] text-muted';

// The difficulty levels the server accepts.
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const filterLabelClass = 'text-[13px] font-bold text-muted';
const filterSelectClass =
    'min-w-[180px] cursor-pointer rounded-lg border border-[#ddd] bg-white px-3 py-2 [font-family:inherit] text-[14px] font-medium text-ink phone:min-w-0 phone:flex-1';

function Activities() {
    const [activities, setActivities] = useState([]);
    const [completedIds, setCompletedIds] = useState(new Set());
    const [progressFailed, setProgressFailed] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedDifficulty, setSelectedDifficulty] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        const startedAt = performance.now();

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
                await holdSkeleton(startedAt, controller.signal);

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

    // The filters work on the list that is already loaded (no new request).
    // The categories offered are the ones the loaded activities really have.
    const categories = useMemo(
        () =>
            [...new Set(activities.map((activity) => activity.category).filter(Boolean))]
                .sort((a, b) => a.localeCompare(b)),
        [activities]
    );

    const visibleActivities = useMemo(
        () =>
            orderedActivities.filter(
                (activity) =>
                    (selectedCategory === 'all' ||
                        activity.category === selectedCategory) &&
                    (selectedDifficulty === 'all' ||
                        activity.difficulty === selectedDifficulty)
            ),
        [orderedActivities, selectedCategory, selectedDifficulty]
    );

    const resetFilters = () => {
        setSelectedCategory('all');
        setSelectedDifficulty('all');
    };

    return (
        <div className="flex min-h-page flex-col">

            {/* Main Content */}
            <main className="mx-auto w-full max-w-[1100px] px-5 pt-[60px] pb-20">
                <div className="mb-10">
                    <h1 className="mb-3 text-[36px] font-bold text-ink">Activities</h1>
                    <p className="text-base font-medium text-muted">
                        Explore activities designed to help develop
                        different skills.
                    </p>
                </div>

                {/* Activity Cards Grid */}
                {isLoading ? (
                    <ActivityCardsSkeleton />
                ) : error ? (
                    <p
                        className="px-5 py-10 text-center text-[15px] text-[#d93025]"
                        role="alert"
                    >
                        {error}
                    </p>
                ) : activities.length === 0 ? (
                    <p className={statusClass}>
                        No activities are available right now.
                    </p>
                ) : (
                    <>
                    <div className="mb-8 flex flex-wrap items-end gap-4">

                        <div className="flex flex-col gap-1.5">
                            <label className={filterLabelClass} htmlFor="activity-filter-category">
                                Category
                            </label>
                            <select
                                id="activity-filter-category"
                                className={filterSelectClass}
                                value={selectedCategory}
                                onChange={(event) => setSelectedCategory(event.target.value)}
                            >
                                <option value="all">All Categories</option>
                                {categories.map((name) => (
                                    <option key={name} value={name}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className={filterLabelClass} htmlFor="activity-filter-difficulty">
                                Difficulty
                            </label>
                            <select
                                id="activity-filter-difficulty"
                                className={filterSelectClass}
                                value={selectedDifficulty}
                                onChange={(event) => setSelectedDifficulty(event.target.value)}
                            >
                                <option value="all">All Difficulties</option>
                                {DIFFICULTIES.map((level) => (
                                    <option key={level} value={level}>
                                        {level}
                                    </option>
                                ))}
                            </select>
                        </div>

                    </div>

                    {progressFailed && (
                        <p className="pb-5 text-center text-[13px] text-muted">
                            We could not load your completion status, so
                            completed activities are not marked right now.
                        </p>
                    )}

                    {visibleActivities.length === 0 ? (
                        <p className={statusClass} role="status">
                            No activities match these filters.{' '}
                            <button
                                type="button"
                                onClick={resetFilters}
                                className="cursor-pointer border-0 bg-transparent p-0 [font-family:inherit] text-[15px] font-bold text-ink underline"
                            >
                                Reset filters
                            </button>
                        </p>
                    ) : (
                    <div className={activityGridClass}>
                        {visibleActivities.map((activity) => (
                            <div
                                className={cardClass}
                                key={activity.id}
                            >
                                <div className="mb-5">
                                    <ActivityPicture
                                        url={activity.image_url}
                                        alt={`Picture of ${activity.title}`}
                                        className="h-[180px] w-full rounded-lg object-cover"
                                        fallback={
                                            <div
                                                className={`h-[180px] w-full rounded-lg bg-cover bg-center ${
                                                    imagePlaceholders[(activity.id - 1) % 6]
                                                }`}
                                            ></div>
                                        }
                                    />
                                </div>

                                {/* The info block fills the card, so the description grows and
                                    the "View Activity" link stays at the bottom edge. */}
                                <div className="flex flex-1 flex-col">
                                    <div className="mb-2.5 flex flex-wrap gap-2">
                                        {activity.difficulty && (
                                            <span
                                                className={difficultyBadgeTw(
                                                    activity.difficulty
                                                )}
                                            >
                                                {activity.difficulty}
                                            </span>
                                        )}

                                        {completedIds.has(activity.id) && (
                                            <span className="rounded-xl bg-success-bg px-2.5 py-[3px] text-xs font-bold text-success-text">
                                                ✓ Completed
                                            </span>
                                        )}
                                    </div>

                                    <h2 className="mb-3 text-[20px] font-bold text-ink">
                                        {activity.title}
                                    </h2>

                                    <p className="mb-6 grow text-[14px] leading-[1.6] text-muted">
                                        {activity.description ||
                                            'Explore this activity and its learning objectives.'}
                                    </p>

                                    <Link
                                        to={`/activities/${activity.id}`}
                                        className="flex items-center gap-2 text-[14px] font-bold text-ink no-underline transition-colors duration-200 hover:text-muted"
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
                    )}
                    </>
                )}
            </main>
        </div>
    );
}

export default Activities;
