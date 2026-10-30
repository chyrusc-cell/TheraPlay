import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { API_URL, apiRequest } from './api.js';
import { ActivityDetailsSkeleton } from './Skeleton.jsx';
import ActivityPicture from './ActivityPicture.jsx';
import { holdSkeleton } from './minLoading.js';
import { useChildren } from './childContext.js';
import { difficultyBadgeTw } from './uiHelpers.js';
import { detailsCardClass, pageMain } from './uiClasses.js';

// The token is saved by Login.jsx in either localStorage or sessionStorage.
const getToken = () =>
    localStorage.getItem('theraplay_token') ||
    sessionStorage.getItem('theraplay_token');

// Is this activity already completed for the logged-in parent? It reads the
// saved progress from the server, so the answer survives refreshes and new
// logins. Guests and failures count as "not completed" and never claim a
// completion that was not saved.
// Completion is per child: this asks about the selected child's progress.
const fetchIsCompleted = async (activityId, signal, childId) => {
    if (!getToken()) {
        return false;
    }

    try {
        const result = await apiRequest(
            childId ? `/progress?child_id=${childId}` : '/progress',
            { signal }
        );

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

const completeButtonBase =
    'cursor-pointer rounded-full border-0 bg-primary p-3 text-[15px] text-white enabled:hover:bg-primary-hover btn-solid';

const messageBase = 'mt-3 text-[14px] font-medium';

/*
 * The activity page. Used as the /activities/:activityId route, and inside the
 * View Activity modal on the Activities page (embedded: it gets the id as a
 * prop and drops the page wrapper and the "Back" link). onCompleted lets the
 * Activities page mark its card as completed.
 */
function ActivityDetails({ activityId: activityIdProp, embedded = false, onCompleted }) {

    const params = useParams();
    const activityId = activityIdProp ?? params.activityId;
    // The globally selected child (completion is recorded for this child).
    const { selectedChildId, status: childStatus, refreshChildren } = useChildren();
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
        // A parent's children are still loading: the completed state depends on them.
        if (childStatus === 'loading') {
            return undefined;
        }

        const controller = new AbortController();
        const startedAt = performance.now();

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
                    fetchIsCompleted(activityId, controller.signal, selectedChildId),
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
                await holdSkeleton(startedAt, controller.signal);

                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        loadActivity();

        return () => controller.abort();
    }, [activityId, childStatus, selectedChildId]);

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
    const completeActivity = async (token, childIdOverride) => {
        const childId = childIdOverride ?? selectedChildId;

        const response = await fetch(
            `${API_URL}/activities/${activityId}/complete`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                // Which child (the server checks it is the parent's own).
                body: JSON.stringify(childId ? { child_id: childId } : {}),
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
        onCompleted?.(activityId);
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

            // Make the new child the selected one everywhere, then complete for it.
            await refreshChildren();

            try {
                await completeActivity(token, data.data?.child?.id);
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


    // On its own page the activity name is the h1; inside the details dialog (whose
    // title is already an h2) it sits one level lower, and so do its sections.
    const Title = embedded ? 'h3' : 'h1';
    const Section = embedded ? 'h4' : 'h2';

    if (isLoading) {

        return (
            <div className={embedded ? '' : 'min-h-page'}>
                <div className={embedded ? '' : pageMain}>
                    <ActivityDetailsSkeleton />
                </div>
            </div>
        );

    }


    if (error) {

        return (
            <div className={`flex flex-col items-center justify-center gap-[15px] ${embedded ? 'py-10' : 'min-h-page'}`}>

                <Title>
                    Something Went Wrong
                </Title>

                <p role="alert">
                    {error}
                </p>

                {!embedded && (
                    <Link to="/activities" className="text-ink">
                        Back to Activities
                    </Link>
                )}

            </div>
        );

    }


    if (notFound || !activity) {

        return (
            <div className={`flex flex-col items-center justify-center gap-[15px] ${embedded ? 'py-10' : 'min-h-page'}`}>

                <Title>
                    Activity Not Found
                </Title>

                <p>
                    The activity you are looking for does not exist.
                </p>

                {!embedded && (
                    <Link to="/activities" className="text-ink">
                        Back to Activities
                    </Link>
                )}

            </div>
        );

    }


    return (
        <div className={embedded ? '' : 'min-h-page'}>

            {/* Main Content */}

            <div className={embedded ? '' : pageMain}>

                {!embedded && (
                    <Link
                        to="/activities"
                        className="mb-[25px] inline-block text-[14px] text-ink no-underline"
                    >
                        ← Back to Activities
                    </Link>
                )}


                <div className={detailsCardClass}>

                    {/* Activity Image */}

                    <ActivityPicture
                        url={activity.image_url}
                        alt={`Picture of ${activity.title}`}
                        className="h-[220px] w-full rounded-lg object-cover tablet-sm:h-[180px]"
                        fallback={
                            <div className="flex h-[220px] items-center justify-center rounded-lg bg-white text-faint tablet-sm:h-[180px]">
                                Image
                            </div>
                        }
                    />


                    {/* Activity Information */}

                    <div>

                        <Title className="mb-3 text-[28px] font-bold">
                            {activity.title}
                        </Title>

                        <div className="mb-[30px] flex gap-2.5">

                            {activity.category && (
                                <span className="rounded-[5px] bg-white px-2.5 py-[5px] text-[13px]">
                                    {activity.category}
                                </span>
                            )}

                            <span className={difficultyBadgeTw(activity.difficulty)}>
                                {activity.difficulty}
                            </span>

                        </div>


                        {/* Objective */}

                        <section className="mb-[25px]">

                            <Section className="mb-2.5 text-[18px] font-bold">
                                Objective
                            </Section>

                            <p className="leading-[1.5] text-muted">
                                {activity.objective}
                            </p>

                        </section>


                        {/* Instructions */}

                        <section className="mb-[25px]">

                            <Section className="mb-2.5 text-[18px] font-bold">
                                Instructions
                            </Section>

                            <ol className="list-decimal pl-5 leading-[1.8] text-body">

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

                        <section className="mb-[25px]">

                            <Section className="mb-2.5 text-[18px] font-bold">
                                Materials
                            </Section>

                            <ul className="list-disc pl-5 leading-[1.8] text-body">

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

                                <ul className="mt-3 list-none pl-5 leading-[1.8] text-body">

                                    {activity.resources.map((resource) => (

                                        <li key={resource.id} className="mb-2">

                                            <button
                                                type="button"
                                                className="cursor-pointer rounded-xl border border-edge-strong btn-glass px-3 py-2 text-left text-[13px] text-ink [word-break:break-word] enabled:hover:bg-hover tablet-sm:w-full"
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
                                <p role="alert" className="mt-2 text-[13px] text-[#d93025]">
                                    {downloadError}
                                </p>
                            )}

                        </section>


                        {showChildForm && (
                            <form
                                className="mb-4 flex flex-col gap-2 rounded-md border border-edge-strong p-4"
                                onSubmit={handleChildSubmit}
                            >
                                <Section className="text-[16px] font-bold">
                                    Add Your Child
                                </Section>

                                <p className="text-[13px] text-muted">
                                    Your child's name is needed to record
                                    completed activities.
                                </p>

                                <label htmlFor="childName" className="text-[13px] text-muted">
                                    Child's name
                                </label>

                                <input
                                    className="rounded-xl border border-edge-strong px-3 py-2.5 text-[14px]"
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
                                        className="text-[13px] text-[#d93025]"
                                    >
                                        {childError}
                                    </p>
                                )}

                                <div className="mt-1 flex gap-3 phone:flex-col">
                                    <button
                                        type="button"
                                        className="cursor-pointer rounded-full border border-edge-strong btn-glass px-5 py-3 text-[15px] text-ink enabled:hover:bg-hover"
                                        onClick={handleChildCancel}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className={`${completeButtonBase} flex-1`}
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
                            className={`${completeButtonBase} w-full`}
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
                                className={`${messageBase} ${
                                    isMessageError
                                        ? 'text-[#d93025]'
                                        : 'text-[#188038]'
                                }`}
                            >
                                {message}
                            </p>
                        )}

                    </div>

                </div>

            </div>

        </div>
    );
}

export default ActivityDetails;