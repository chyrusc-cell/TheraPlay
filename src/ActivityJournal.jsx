import { useEffect, useRef, useState } from 'react';
import { apiRequest } from './api.js';
import Button from './Button.jsx';
import Modal from './Modal.jsx';
import StarRating, { StarDisplay } from './StarRating.jsx';
import * as ui from './adminClasses.js';
import { NOTE_MAX, formatSessionDate } from './journalFormat.js';

/*
 * Rate and write a note about ONE completed session (shown after "Mark as
 * Completed" has succeeded, or later from the activity page).
 *  - The rating is how helpful/effective the activity was for the child (1-5 stars,
 *    required); the journal text is optional.
 *  - The note stays in the box when a save fails, and Save is locked while a request
 *    is running, so nothing is lost or sent twice. Skipping with a typed note asks
 *    first.
 *  - The server decides everything else: the child, the activity and the session
 *    come from the progress record, and an unverified parent is refused.
 */
function JournalFormBody({ entry, progressId, activityTitle, childName, onSaved, onClose, skipRef }) {
    const [rating, setRating] = useState(entry?.rating ?? 0);
    const [note, setNote] = useState(entry?.note ?? '');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [confirmingSkip, setConfirmingSkip] = useState(false);
    const busy = useRef(false);

    const handleSave = async (event) => {
        event.preventDefault();

        if (busy.current) {
            return;
        }

        if (!rating) {
            setError('Please choose a rating from 1 to 5 stars.');
            return;
        }

        busy.current = true;
        setSaving(true);
        setError('');

        try {
            const result = await apiRequest(entry ? `/journal/${entry.id}` : `/progress/${progressId}/journal`, {
                method: entry ? 'PUT' : 'POST',
                body: { rating, note: note.trim() },
            });

            if (result.ok) {
                onSaved?.(result.data.data.entry);
                return;
            }

            if (result.status === 409 && result.data?.code === 'journal_exists') {
                // Saved already (another tab or an earlier click): nothing more to do.
                onSaved?.(null);
                return;
            }

            // The typed note stays in the box so it can be saved again.
            setError(
                result.data?.errors?.rating?.[0] ||
                    result.data?.errors?.note?.[0] ||
                    result.data?.message ||
                    'We could not save your journal entry. Your note is still here; please try again.'
            );
        } catch {
            setError('We could not reach the server. Your note is still here; please try again.');
        } finally {
            busy.current = false;
            setSaving(false);
        }
    };

    const handleSkip = () => {
        if (saving) {
            return;
        }

        if (note.trim() && !confirmingSkip) {
            setConfirmingSkip(true);
            return;
        }

        onClose();
    };

    // Escape, the backdrop and the close button of the dialog go through the same check.
    useEffect(() => {
        skipRef.current = handleSkip;
    });

    return (
        <form
            onSubmit={handleSave}
            noValidate
            data-testid="journal-form"
            className="flex flex-col gap-4"
        >
                <p className="text-[14px] leading-[1.6] text-muted">
                    {childName ? `${childName} completed ` : 'Completed: '}
                    <strong className="text-ink">{activityTitle}</strong>. Your rating and notes are saved
                    for this session only, so you can look back on {childName ? `${childName}'s` : "your child's"} progress later.
                </p>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="journal-note" className="text-[14px] font-bold text-ink">
                        Session Journal / Parent&apos;s Observation
                    </label>
                    <textarea
                        id="journal-note"
                        className="h-40 w-full resize-none overflow-y-auto rounded-xl border border-edge-strong px-3.5 py-3 [font-family:inherit] text-[15px] font-medium text-ink transition-[border-color] focus:border-accent"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        maxLength={NOTE_MAX}
                        disabled={saving}
                        placeholder="What happened? How did your child do? Any improvements or difficulties, how they seemed to feel, and reminders for next time."
                        aria-describedby="journal-note-count"
                    />
                    <p id="journal-note-count" className="text-right text-[12px] text-faint">
                        {note.length} / {NOTE_MAX}
                    </p>
                </div>

                <div>
                    <p className="mb-1 text-[14px] font-bold text-ink" id="journal-rating-label">
                        How effective or helpful was this activity for your child?
                    </p>
                    <StarRating
                        value={rating}
                        onChange={(value) => {
                            setRating(value);
                            setError('');
                        }}
                        disabled={saving}
                        label="How helpful was this activity"
                    />
                </div>


                {error && (
                    <p role="alert" className="text-[13px] font-medium text-[#d93025]">
                        {error}
                    </p>
                )}

                {confirmingSkip && (
                    <p role="alert" className="text-[13px] font-medium text-[#b26a00]">
                        You have written a note that has not been saved. Skip and discard it?
                    </p>
                )}

                <div className={ui.formActions}>
                    <Button type="button" variant="secondary" onClick={handleSkip} disabled={saving}>
                        {confirmingSkip ? 'Discard and skip' : 'Skip for now'}
                    </Button>
                    {confirmingSkip && (
                        <Button type="button" variant="secondary" onClick={() => setConfirmingSkip(false)} disabled={saving}>
                            Keep writing
                        </Button>
                    )}
                    <Button type="submit" variant="success" loading={saving} disabled={saving}>
                        {saving ? 'Saving...' : entry ? 'Save changes' : 'Save journal entry'}
                    </Button>
                </div>
        </form>
    );
}

// The journal opens as a dialog over the activity page.
export function JournalForm({ open, onClose, ...props }) {
    const skipRef = useRef(null);

    return (
        <Modal open={open} onClose={() => skipRef.current?.()} title={props.entry ? 'Edit Session Journal' : 'Session Journal'} size="md">
            {open && <JournalFormBody {...props} onClose={onClose} skipRef={skipRef} />}
        </Modal>
    );
}

/*
 * The selected child's journal for ONE activity: every saved session, newest first,
 * each with its own date, rating and note (older entries are never overwritten).
 */
export function JournalHistory({ entries, status, childName, onRetry, canAdd, onAdd, onEdit, onDelete }) {
    return (
        <section className="mb-[25px]" aria-labelledby="journal-history-heading" data-testid="journal-history">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <h4 id="journal-history-heading" className="text-[18px] font-bold">
                    Session Journal{childName ? ` for ${childName}` : ''}
                </h4>
                {canAdd && (
                    <Button size="small" variant="secondary" onClick={onAdd}>
                        Add journal entry
                    </Button>
                )}
            </div>

            {status === 'loading' && <p className="text-[14px] text-muted" role="status">Loading journal...</p>}

            {status === 'error' && (
                <p className="text-[14px] text-[#d93025]" role="alert">
                    We could not load the journal.{' '}
                    <button type="button" className="cursor-pointer font-bold underline" onClick={onRetry}>
                        Try again
                    </button>
                </p>
            )}

            {status === 'ready' && entries.length === 0 && (
                <p className="text-[14px] text-muted">
                    No journal entries yet. When you complete this activity you can rate it and write what
                    you noticed.
                </p>
            )}

            {status === 'ready' && entries.length > 0 && (
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                    {entries.map((entry) => (
                        <li key={entry.id} className="rounded-lg border border-edge card-soft p-4">
                            {entry.note ? (
                                <p className="mb-3 max-h-[180px] overflow-y-auto whitespace-pre-wrap pr-1 text-[14px] leading-[1.6] text-body [overflow-wrap:anywhere]">
                                    {entry.note}
                                </p>
                            ) : (
                                <p className="mb-3 text-[13px] italic text-faint">No notes for this session.</p>
                            )}
                            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                                <StarDisplay value={entry.rating} />
                                <time className="text-[12px] text-faint" dateTime={entry.session_completed_at}>
                                    {formatSessionDate(entry.session_completed_at)}
                                </time>
                            </div>
                            <div className="mb-2 flex justify-end gap-2">
                                <Button size="small" variant="secondary" onClick={() => onEdit?.(entry)} aria-label={`Edit journal entry from ${formatSessionDate(entry.session_completed_at)}`}>
                                    Edit
                                </Button>
                                <Button size="small" variant="danger" onClick={() => onDelete?.(entry)} aria-label={`Delete journal entry from ${formatSessionDate(entry.session_completed_at)}`}>
                                    Delete
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
