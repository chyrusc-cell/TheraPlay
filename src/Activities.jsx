import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { API_URL, apiRequest, clearSession, getToken } from './api.js';
import { ActivityCardsSkeleton } from './Skeleton.jsx';
import ActivityPicture from './ActivityPicture.jsx';
import { useChildGate } from './useChildGate.jsx';
import { holdSkeleton } from './minLoading.js';
import { difficultyBadgeTw } from './uiHelpers.js';
import { activityCardClass, activityGridClass, pageMain, pageHeader, pageTitle, pageSubtitle } from './uiClasses.js';
import FilterDropdown from './FilterDropdown.jsx';

// Which activities has the selected child completed? This reads the same saved
// progress as the Progress page. Only a parent with a selected child has any:
// guests, admins, parents without a child, expired logins and failures simply
// mean "nothing completed" and never mark anything as completed (and no request
// is made when there is no child to ask about).
const loadCompletedIds = async (signal, childId) => {
    if (!childId || !getToken()) {
        return { completedIds: new Set(), failed: false };
    }

    try {
        const result = await apiRequest(`/progress?child_id=${childId}`, { signal });

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
// Soft warm tints for activities without a picture.
const imagePlaceholders = [
    'bg-accent-soft',
    'bg-[#f5e6d6]',
    'bg-warm',
    'bg-[#f4ead8]',
    'bg-sunken',
    'bg-[#fbeedd]',
];

// A completed activity's card is a green-tinted glass instead of the usual white one (only the
// glass fill variable changes, so size, glow and hover are the same).
const completedCardTone = '[--glass-bg:rgba(64,134,64,0.5)]';

const statusClass = 'px-5 py-10 text-center text-[15px] text-muted';

// The difficulty levels the server accepts.
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];


function Activities() {
    // Every parent sees ALL published activities (their child's conditions do
    // not limit the list). The selected child only decides which activities are
    // marked as completed.
    const { selectedChildId, childStatus, waiting } = useChildGate();
    // The child whose load has FINISHED, whether it worked or failed. (It says
    // "a result, or an error, is on screen for this child"; whether the data
    // arrived is the separate `error` state.)
    const [settledChildId, setSettledChildId] = useState(undefined);
    const [activities, setActivities] = useState([]);
    const [completedIds, setCompletedIds] = useState(new Set());
    const [progressFailed, setProgressFailed] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedDifficulty, setSelectedDifficulty] = useState('all');
    // all | completed | todo (for the selected child; only offered when there is one).
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [isLoadingNow, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // While the selected child changed but its load has not finished yet, show
    // the skeleton, never the previous child's completed state.
    const isLoading =
        isLoadingNow || (childStatus === 'ready' && settledChildId !== selectedChildId);

    useEffect(() => {
        // Wait until the login is verified and a parent's children are loaded: only
        // then is it known whether (and for which child) completion can be asked.
        // With no child, for admins and guests, or if the children could not be
        // loaded, the activities are still shown, just without completed marks.
        if (waiting) {
            return undefined;
        }

        const controller = new AbortController();
        const startedAt = performance.now();

        const fetchActivities = async () => {
            try {
                setIsLoading(true);
                setError('');

                // Both are loaded before anything is shown, so the cards do
                // not appear in one order and then jump into another.
                const [response, progress] = await Promise.all([
                    fetch(`${API_URL}/activities`, {
                        headers: {
                            Accept: 'application/json',
                        },
                        signal: controller.signal,
                    }),
                    loadCompletedIds(controller.signal, selectedChildId),
                ]);

                if (!response.ok) {
                    throw new Error('Unable to load activities.');
                }

                const result = await response.json();

                // A newer load (another child) has taken over: drop this answer.
                if (controller.signal.aborted) {
                    return;
                }

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

                // The load is over (worked or failed): show the result or the error.
                if (!controller.signal.aborted) {
                    setSettledChildId(selectedChildId);
                    setIsLoading(false);
                }
            }
        };

        fetchActivities();

        return () => controller.abort();
    }, [waiting, childStatus, selectedChildId]);

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

    // "Completed" only means something for a selected child whose progress loaded;
    // otherwise the status choice is ignored (and its dropdown is hidden).
    const statusFilterAvailable = Boolean(selectedChildId) && !progressFailed;
    const activeStatus = statusFilterAvailable ? selectedStatus : 'all';

    const visibleActivities = useMemo(
        () =>
            orderedActivities.filter(
                (activity) =>
                    (selectedCategory === 'all' ||
                        activity.category === selectedCategory) &&
                    (selectedDifficulty === 'all' ||
                        activity.difficulty === selectedDifficulty) &&
                    (activeStatus === 'all' ||
                        (activeStatus === 'completed') === completedIds.has(activity.id))
            ),
        [orderedActivities, selectedCategory, selectedDifficulty, activeStatus, completedIds]
    );

    const resetFilters = () => {
        setSelectedCategory('all');
        setSelectedDifficulty('all');
        setSelectedStatus('all');
    };

    return (
        <div className="flex min-h-page flex-col">

            {/* Main Content */}
            <div className={pageMain}>
                <div className={pageHeader}>
                    <h1 className={pageTitle}>Activities</h1>
                    <p className={pageSubtitle}>
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

                        <FilterDropdown
                            label="Category"
                            value={selectedCategory}
                            onChange={setSelectedCategory}
                            options={[
                                { value: 'all', label: 'All Categories' },
                                ...categories.map((name) => ({ value: name, label: name })),
                            ]}
                        />

                        <FilterDropdown
                            label="Difficulty"
                            value={selectedDifficulty}
                            onChange={setSelectedDifficulty}
                            options={[
                                { value: 'all', label: 'All Difficulties' },
                                ...DIFFICULTIES.map((level) => ({ value: level, label: level })),
                            ]}
                        />

                        {/* Only for a parent with a selected child, since "completed" is per child. */}
                        {statusFilterAvailable && (
                            <FilterDropdown
                                label="Status"
                                value={selectedStatus}
                                onChange={setSelectedStatus}
                                options={[
                                    { value: 'all', label: 'All Activities' },
                                    { value: 'completed', label: 'Completed' },
                                    { value: 'todo', label: 'Not Completed' },
                                ]}
                            />
                        )}

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
                                className={`${activityCardClass}${completedIds.has(activity.id) ? ' ' + completedCardTone : ''}`}
                                data-completed={completedIds.has(activity.id) || undefined}
                                key={activity.id}
                            >
                                <div className="mb-5">
                                    <ActivityPicture
                                        urls={[activity.image_url, activity.thumbnail_url, activity.attachment_image_url]}
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
                                            <span className="inline-flex items-center gap-1 text-xs font-bold italic text-[#0b6b28]">
                                                Completed
                                                <Check size={14} aria-hidden="true" />
                                            </span>
                                        )}
                                    </div>

                                    <h2 className={`mb-3 text-[20px] font-bold ${completedIds.has(activity.id) ? 'text-black' : 'text-ink'}`}>
                                        {activity.title}
                                    </h2>

                                    <p className={`mb-6 grow text-[14px] leading-[1.6] ${completedIds.has(activity.id) ? 'text-black' : 'text-muted'}`}>
                                        {activity.description ||
                                            'Explore this activity and its learning objectives.'}
                                    </p>

                                    <Link
                                        to={`/activities/${activity.id}`}
                                        className={`flex items-center gap-2 text-[14px] font-bold no-underline transition-colors duration-200 ${completedIds.has(activity.id) ? 'text-black hover:text-ink' : 'text-ink hover:text-muted'}`}
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
            </div>
        </div>
    );
}

export default Activities;
