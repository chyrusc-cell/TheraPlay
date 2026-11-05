import { useState, useEffect } from 'react';
import { Check, Download, LoaderCircle } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { API_URL, apiRequest, getToken } from './api.js';
import { ActivityDetailsSkeleton } from './Skeleton.jsx';
import ActivityPicture from './ActivityPicture.jsx';
import AttachmentViewer from './AttachmentViewer.jsx';
import { previewKind, typeLabel } from './attachmentTypes.js';
import { holdSkeleton } from './minLoading.js';
import { useChildren } from './childContext.js';
import { difficultyBadgeTw } from './uiHelpers.js';
import { detailsCardClass, pageMain } from './uiClasses.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import { JournalForm, JournalHistory } from './ActivityJournal.jsx';
import { VERIFY_CODE_PATH, isUnverifiedParent, useAuth } from './authContext.js';

// Is this activity already completed for the logged-in parent? (Resolves with the
// completed progress record, or null.) It reads the
// saved progress from the server, so the answer survives refreshes and new
// logins. Guests and failures count as "not completed" and never claim a
// completion that was not saved.
// Completion is per child: this asks about the selected child's progress.
const fetchIsCompleted = async (activityId, signal, childId) => {
    if (!getToken()) {
        return null;
    }

    try {
        const result = await apiRequest(
            childId ? `/progress?child_id=${childId}` : '/progress',
            { signal }
        );

        if (!result.ok) {
            return null;
        }

        const records = result.data.data?.records;

        return (
            (Array.isArray(records) &&
                records.find(
                    (record) =>
                        String(record.activity_id) === String(activityId) &&
                        record.status === 'completed'
                )) ||
            null
        );
    } catch (error) {
        if (error.name === 'AbortError') {
            throw error;
        }

        return null;
    }
};

// The two header buttons share one height (their widths follow their labels).
const headerButtonSize = 'h-10 shrink-0 cursor-pointer rounded-full px-5 text-[14px] font-bold whitespace-nowrap';
const completeButtonClass = `${headerButtonSize} btn-glass btn-green disabled:cursor-not-allowed`;
const undoButtonClass = `${headerButtonSize} border btn-glass btn-red disabled:cursor-not-allowed disabled:opacity-60`;

const completeButtonBase =
    'cursor-pointer rounded-full p-3 text-[15px] btn-glass btn-green';

const messageBase = 'mt-3 text-[14px] font-medium';

const attachmentButtonClass =
    'cursor-pointer rounded-xl border btn-glass btn-white px-3 py-2 text-left text-[13px] text-ink [word-break:break-word] enabled:hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink tablet-sm:w-full';

const downloadIconClass =
    'inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border btn-glass btn-white text-ink enabled:hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60';

/*
 * The activity page. Used as the /activities/:activityId route, and inside the
 * View Activity modal on the Activities page (embedded: it gets the id as a
 * prop and drops the page wrapper and the "Back" link). onCompleted lets the
 * Activities page mark its card as completed; onUndone lets it clear that mark.
 */
function ActivityDetails({ activityId: activityIdProp, embedded = false, onCompleted, onUndone }) {

    const params = useParams();
    const activityId = activityIdProp ?? params.activityId;
    // The globally selected child (completion is recorded for this child).
    const { selectedChildId, selectedChild, status: childStatus, refreshChildren } = useChildren();
    const { user } = useAuth();
    const isParent = user?.role === 'parent';
    const unverified = isUnverifiedParent(user);
    const selectedChildName = selectedChild?.name;
    const navigate = useNavigate();

    const [activity, setActivity] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [completionRecordId, setCompletionRecordId] = useState(null);
    // The progress record whose session journal form is open (right after completing).
    const [journalFormFor, setJournalFormFor] = useState(null);
    // An existing entry being edited, or being deleted (asks first).
    const [editingEntry, setEditingEntry] = useState(null);
    const [deletingEntry, setDeletingEntry] = useState(null);
    const [isDeletingEntry, setIsDeletingEntry] = useState(false);
    const [journalEntries, setJournalEntries] = useState([]);
    const [journalStatus, setJournalStatus] = useState('idle');
    const [journalReloadKey, setJournalReloadKey] = useState(0);
    const [confirmingUndo, setConfirmingUndo] = useState(false);
    const [isUndoing, setIsUndoing] = useState(false);
    const [message, setMessage] = useState('');
    const [isMessageError, setIsMessageError] = useState(false);

    const [showChildForm, setShowChildForm] = useState(false);
    const [childName, setChildName] = useState('');
    const [childError, setChildError] = useState('');

    const [downloadingId, setDownloadingId] = useState(null);
    const [downloadError, setDownloadError] = useState('');
    const [previewResource, setPreviewResource] = useState(null);

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
                setIsCompleted(Boolean(completed));
                setCompletionRecordId(completed?.id ?? null);
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

    // The selected child's saved journal entries for this activity (parents only).
    useEffect(() => {
        if (!isParent || !selectedChildId || childStatus !== 'ready') {
            // Nothing to load (the journal section is not shown for this account/child).
            return undefined;
        }

        const controller = new AbortController();

        (async () => {
            setJournalStatus('loading');

            try {
                const result = await apiRequest(
                    `/activities/${activityId}/journal?child_id=${selectedChildId}`,
                    { signal: controller.signal }
                );

                if (controller.signal.aborted) {
                    return;
                }

                if (result.ok) {
                    setJournalEntries(Array.isArray(result.data.data) ? result.data.data : []);
                    setJournalStatus('ready');
                } else {
                    setJournalStatus('error');
                }
            } catch (err) {
                if (err.name !== 'AbortError') {
                    setJournalStatus('error');
                }
            }
        })();

        return () => controller.abort();
    }, [activityId, isParent, selectedChildId, childStatus, journalReloadKey]);

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
        setCompletionRecordId(data.data?.record?.id ?? null);

        // A fresh completion invites the parent to rate it, but only when the activity has no journal entry yet (one per activity).
        if (!data.already_completed && data.data?.record?.id && journalEntries.length === 0) {
            setJournalFormFor(data.data.record.id);
        }

        onCompleted?.(activityId);
        setMessage(data.message || 'Activity marked as completed.');
        return true;
    };

    // Takes an accidental completion back. The server checks the record belongs
    // to one of this parent's own children.
    const handleUndo = async () => {
        if (isUndoing || !completionRecordId) {
            return;
        }

        setIsUndoing(true);
        setMessage('');
        setIsMessageError(false);

        try {
            const result = await apiRequest(`/progress/${completionRecordId}/undo`, { method: 'POST' });

            if (result.status === 401) {
                redirectToLogin('Your session has expired. Please log in again.');
                return;
            }

            if (!result.ok) {
                setIsMessageError(true);
                setMessage(result.data?.message || 'We could not undo this completion. Please try again.');
                return;
            }

            setIsCompleted(false);
            setCompletionRecordId(null);
            setJournalFormFor(null);
            onUndone?.(activityId);
            setMessage('Completion undone. This activity is no longer marked as completed.');
        } catch {
            setIsMessageError(true);
            setMessage('We could not reach the server. Please try again.');
        } finally {
            setIsUndoing(false);
            setConfirmingUndo(false);
        }
    };

    const handleDeleteEntry = async () => {
        if (!deletingEntry || isDeletingEntry) {
            return;
        }

        setIsDeletingEntry(true);

        try {
            const result = await apiRequest(`/journal/${deletingEntry.id}`, { method: 'DELETE' });

            // 404 = already gone, which is what the parent wanted.
            if (result.ok || result.status === 404) {
                setIsMessageError(false);
                setMessage('Your journal entry was deleted.');
                setJournalReloadKey((key) => key + 1);
            } else {
                setIsMessageError(true);
                setMessage(result.data?.message || 'We could not delete this journal entry. Please try again.');
            }
        } catch {
            setIsMessageError(true);
            setMessage('We could not reach the server. Please try again.');
        } finally {
            setIsDeletingEntry(false);
            setDeletingEntry(null);
        }
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

    const showJournal = isParent && Boolean(selectedChildId) && !unverified;
    const canAddEntry =
        showJournal && isCompleted && Boolean(completionRecordId) && journalStatus === 'ready' &&
        journalEntries.length === 0 && !journalFormFor;

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
                        urls={[activity.image_url, activity.thumbnail_url, activity.attachment_image_url]}
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

                        <div className="mb-3 flex items-start justify-between gap-4">

                            <Title className="text-[28px] font-bold">
                                {activity.title}
                            </Title>

                            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">

                                {isCompleted ? (
                                    <span className="inline-flex h-10 items-center gap-1.5 text-[14px] font-bold italic text-[#188038]">
                                        Completed
                                        <Check size={18} aria-hidden="true" />
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        className={completeButtonClass}
                                        onClick={handleComplete}
                                        disabled={isSubmitting || showChildForm || unverified}
                                        aria-describedby={unverified ? 'verify-to-complete' : undefined}
                                    >
                                        {isSubmitting ? 'Saving...' : 'Mark as Completed'}
                                    </button>
                                )}

                                {isCompleted && completionRecordId && (
                                    <button
                                        type="button"
                                        className={undoButtonClass}
                                        onClick={() => setConfirmingUndo(true)}
                                        disabled={isUndoing}
                                    >
                                        Undo completion
                                    </button>
                                )}

                            </div>

                        </div>

                        {unverified && (
                            <p id="verify-to-complete" className="mt-2 text-[13px] text-muted">
                                Verify your email to mark activities as completed.{' '}
                                <Link to={VERIFY_CODE_PATH} className="font-bold text-ink underline">
                                    Verify now
                                </Link>
                            </p>
                        )}

                        <JournalForm
                                    open={Boolean(journalFormFor || editingEntry)}
                                    entry={editingEntry}
                                    progressId={journalFormFor}
                                    activityTitle={activity.title}
                                    childName={selectedChildName}
                                    onClose={() => {
                                        setJournalFormFor(null);
                                        setEditingEntry(null);
                                    }}
                                    onSaved={() => {
                                        setMessage(editingEntry ? 'Your journal entry was updated.' : 'Your journal entry was saved.');
                                        setJournalFormFor(null);
                                        setEditingEntry(null);
                                        setIsMessageError(false);
                                        setJournalReloadKey((key) => key + 1);
                                    }}
                                />



                        <div className="mb-[30px] flex gap-2.5">

                            {activity.category && (
                                <span className="rounded-[5px] border border-black bg-white px-2.5 py-[5px] text-[13px]">
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

                                            <p className="text-[13px] text-muted [word-break:break-word]">
                                                {resource.file_name} &middot; {typeLabel(resource.file_type)}
                                            </p>

                                            <div className="flex flex-wrap gap-2">

                                                {previewKind(resource.file_type) ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className={attachmentButtonClass}
                                                            onClick={() => setPreviewResource(resource)}
                                                        >
                                                            {`View ${resource.file_name}`}
                                                        </button>

                                                        {/* Icon-only download, right beside View. */}
                                                        <button
                                                            type="button"
                                                            className={downloadIconClass}
                                                            aria-label={`Download ${resource.file_name}`}
                                                            title={`Download ${resource.file_name}`}
                                                            onClick={() => handleDownload(resource)}
                                                            disabled={downloadingId !== null}
                                                            aria-busy={downloadingId === resource.id || undefined}
                                                        >
                                                            {downloadingId === resource.id ? (
                                                                <LoaderCircle size={18} aria-hidden="true" className="motion-safe:animate-spin" />
                                                            ) : (
                                                                <Download size={18} aria-hidden="true" />
                                                            )}
                                                        </button>
                                                    </>
                                                ) : (
                                                    // Download-only files (Word, Excel, PowerPoint) have nothing to
                                                    // view, so their one action keeps its visible label.
                                                    <button
                                                        type="button"
                                                        className={attachmentButtonClass}
                                                        onClick={() => handleDownload(resource)}
                                                        disabled={downloadingId !== null}
                                                    >
                                                        {downloadingId === resource.id
                                                            ? 'Downloading...'
                                                            : `Download ${resource.file_name}`}
                                                    </button>
                                                )}

                                            </div>

                                        </li>

                                    ))}

                                </ul>

                            )}

                            {downloadError && (
                                <p role="alert" className="mt-2 text-[13px] text-[#d93025]">
                                    {downloadError}
                                </p>
                            )}

                            <AttachmentViewer
                                activityId={activityId}
                                resource={previewResource}
                                onClose={() => setPreviewResource(null)}
                                onDownload={handleDownload}
                                downloading={downloadingId !== null}
                            />

                        </section>


                        {/* The parent's saved sessions for the selected child (newest first). */}

                        {showJournal && (
                            <JournalHistory
                                entries={journalEntries}
                                status={journalStatus}
                                childName={selectedChildName}
                                onRetry={() => setJournalReloadKey((key) => key + 1)}
                                canAdd={canAddEntry}
                                onAdd={() => setJournalFormFor(completionRecordId)}
                                onEdit={(entry) => setEditingEntry(entry)}
                                onDelete={(entry) => setDeletingEntry(entry)}
                            />
                        )}


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
                                        className="cursor-pointer rounded-full border btn-glass btn-white px-5 py-3 text-[15px] text-ink enabled:hover:bg-hover"
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

                        <ConfirmDialog
                            open={deletingEntry !== null}
                            title="Delete this journal entry?"
                            message="This rating and note will be permanently deleted. The activity stays completed."
                            confirmLabel="Delete entry"
                            confirmVariant="danger"
                            busyLabel="Deleting..."
                            busy={isDeletingEntry}
                            onConfirm={handleDeleteEntry}
                            onCancel={() => setDeletingEntry(null)}
                        />

                        <ConfirmDialog
                            open={confirmingUndo}
                            title="Undo completion?"
                            message={`"${activity?.title || 'This activity'}" will no longer be marked as completed. You can mark it as completed again later.`}
                            confirmLabel="Undo completion"
                            busyLabel="Undoing..."
                            busy={isUndoing}
                            onConfirm={handleUndo}
                            onCancel={() => setConfirmingUndo(false)}
                        />

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