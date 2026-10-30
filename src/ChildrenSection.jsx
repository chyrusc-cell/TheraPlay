import { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiRequest, clearSession, mapValidationErrors } from './api.js';
import { useChildren } from './childContext.js';
import { validateChild } from './childValidation.js';
import ChildFormFields from './ChildFormFields.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import Modal from './Modal.jsx';

const cardClass =
    'mb-6 overflow-hidden rounded-2xl border border-edge bg-white p-[30px] card-soft phone:p-5';
const pillClass =
    'cursor-pointer rounded-[20px] border border-accent/45 btn-glass px-4 py-1.5 [font-family:inherit] text-[13px] font-bold text-ink enabled:hover:bg-accent enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-60';
const primaryClass =
    'cursor-pointer rounded-full border-0 bg-primary px-6 py-2.5 [font-family:inherit] text-[14px] font-bold text-white enabled:hover:bg-primary-hover btn-solid disabled:cursor-not-allowed disabled:opacity-60';
const cancelClass =
    'cursor-pointer rounded-full border border-accent/45 btn-glass px-6 py-2.5 [font-family:inherit] text-[14px] font-bold text-ink enabled:hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60';

const emptyForm = { name: '', dateOfBirth: '', conditionIds: [] };

// "3 years", "8 months": a friendly age from the date of birth.
const ageText = (dob) => {
    if (!dob) {
        return '';
    }

    const born = new Date(`${dob}T00:00:00`);
    const now = new Date();
    let months = (now.getFullYear() - born.getFullYear()) * 12 + now.getMonth() - born.getMonth();

    if (now.getDate() < born.getDate()) {
        months -= 1;
    }

    if (months < 0) {
        return '';
    }

    if (months < 24) {
        return `${months} month${months === 1 ? '' : 's'} old`;
    }

    return `${Math.floor(months / 12)} years old`;
};

/*
 * "My Children" on the Profile page: every child of this parent, with add, edit
 * (including their conditions), delete and "use this child". It always lists ALL
 * the parent's children (the global selector only decides which one is active
 * elsewhere). Parents only.
 */
function ChildrenSection() {
    const navigate = useNavigate();
    const location = useLocation();
    const { children, status, selectedChildId, selectChild, refreshChildren } = useChildren();

    // Opened with "Add a child" from the top bar or a no-child prompt.
    const [formOpen, setFormOpen] = useState(() => Boolean(location.state?.addChild));
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [deleting, setDeleting] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [notice, setNotice] = useState(null);

    const openerRef = useRef(null);

    if (status === 'idle') {
        return null;
    }

    const handleUnauthorized = () => {
        clearSession();
        navigate('/login', { replace: true, state: { message: 'Please log in to continue.' } });
    };

    const openAdd = () => {
        setEditing(null);
        setForm(emptyForm);
        setErrors({});
        setFormError('');
        setFormOpen(true);
    };

    const openEdit = (child) => {
        setEditing(child);
        setForm({
            name: child.name,
            dateOfBirth: child.date_of_birth || '',
            conditionIds: (child.conditions || []).filter((c) => c.is_active).map((c) => c.id),
        });
        setErrors({});
        setFormError('');
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditing(null);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (isSaving) {
            return;
        }

        const problems = validateChild(form);

        if (Object.keys(problems).length > 0) {
            setErrors(problems);
            setFormError('Please fix the highlighted fields.');
            return;
        }

        setIsSaving(true);
        setErrors({});
        setFormError('');
        setNotice(null);

        try {
            const result = await apiRequest(editing ? `/children/${editing.id}` : '/children', {
                method: editing ? 'PUT' : 'POST',
                body: {
                    name: form.name.trim(),
                    date_of_birth: form.dateOfBirth || null,
                    condition_ids: form.conditionIds,
                },
            });

            if (result.status === 401) {
                handleUnauthorized();
                return;
            }

            if (result.status === 422) {
                const mapped = mapValidationErrors(result.data.errors);

                setErrors({
                    name: mapped.name,
                    date_of_birth: mapped.date_of_birth,
                    condition_ids: mapped.condition_ids,
                });
                setFormError('Please fix the highlighted fields.');
                return;
            }

            if (!result.ok) {
                throw new Error(result.data.message || 'Unable to save the child profile. Please try again.');
            }

            const savedId = result.data.data?.child?.id;

            await refreshChildren();

            // A newly added child becomes the selected one.
            if (!editing && savedId) {
                selectChild(savedId);
            }

            setNotice({ type: 'success', text: editing ? 'Child profile updated.' : 'Child profile added.' });
            closeForm();
        } catch (error) {
            // What was typed stays in the form.
            setFormError(error.message || 'Unable to connect to the server. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleting || isDeleting) {
            return;
        }

        setIsDeleting(true);

        try {
            const result = await apiRequest(`/children/${deleting.id}`, { method: 'DELETE' });

            if (result.status === 401) {
                handleUnauthorized();
                return;
            }

            if (!result.ok) {
                setNotice({
                    type: 'error',
                    text:
                        result.data.code === 'child_has_progress'
                            ? `${deleting.name} has saved activity progress, so the profile cannot be deleted. (Progress is never erased automatically.)`
                            : result.data.message || 'Unable to delete the child profile.',
                });
            } else {
                await refreshChildren();
                setNotice({ type: 'success', text: 'Child profile deleted.' });
            }

            setDeleting(null);
        } catch {
            setNotice({ type: 'error', text: 'Unable to connect to the server. Please try again.' });
            setDeleting(null);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <section className={cardClass} aria-labelledby="my-children-title">

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 id="my-children-title" className="text-[18px] font-bold text-ink">My Children</h2>

                <button
                    type="button"
                    className={pillClass}
                    onClick={(event) => {
                        openerRef.current = event.currentTarget;
                        openAdd();
                    }}
                >
                    Add a child
                </button>
            </div>

            <p className="mb-5 text-[13px] leading-[1.5] text-faint">
                Activities, progress and your dashboard are shown for the child chosen with
                <strong> Choose Child</strong> in the top bar. Conditions are reported by you,
                not a professional diagnosis.
            </p>

            {notice && (
                <p
                    className={`mb-4 text-[14px] font-medium ${notice.type === 'error' ? 'text-[#d93025]' : 'text-[#188038]'}`}
                    role={notice.type === 'error' ? 'alert' : 'status'}
                >
                    {notice.text}
                </p>
            )}

            {status === 'loading' ? (

                <p className="text-[14px] text-muted" role="status">Loading your children...</p>

            ) : status === 'error' ? (

                <div role="alert">
                    <p className="mb-3 text-[14px] text-[#d93025]">We could not load your child profiles.</p>
                    <button type="button" className={pillClass} onClick={refreshChildren}>Try again</button>
                </div>

            ) : children.length === 0 ? (

                <p className="text-[14px] text-muted">
                    You have not added a child yet. Add a child profile to see activities and
                    track progress.
                </p>

            ) : (

                <ul className="flex list-none flex-col gap-3">
                    {children.map((child) => {
                        const isSelected = child.id === selectedChildId;
                        const age = ageText(child.date_of_birth);

                        return (
                            <li
                                key={child.id}
                                className={`rounded-lg border p-4 ${isSelected ? 'border-accent bg-accent-soft' : 'border-edge bg-warm'}`}
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">

                                    <div className="min-w-0">
                                        <h3 className="text-[16px] font-bold text-ink [overflow-wrap:anywhere]">
                                            {child.name}
                                            {isSelected && (
                                                <span className="ml-2 rounded-xl bg-accent px-2 py-0.5 align-middle text-[11px] font-bold text-white">
                                                    Selected
                                                </span>
                                            )}
                                        </h3>
                                        {age && <p className="mt-0.5 text-[13px] text-muted">{age}</p>}
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {!isSelected && (
                                            <button type="button" className={pillClass} onClick={() => selectChild(child.id)}>
                                                Use this child
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className={pillClass}
                                            onClick={(event) => {
                                                openerRef.current = event.currentTarget;
                                                openEdit(child);
                                            }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            className={pillClass}
                                            onClick={() => setDeleting(child)}
                                        >
                                            Delete
                                        </button>
                                    </div>

                                </div>

                                <p className="mt-2 text-[13px] text-muted">
                                    {(child.conditions || []).length > 0
                                        ? child.conditions
                                              .map((c) => (c.is_active ? c.name : `${c.name} (no longer offered)`))
                                              .join(', ')
                                        : 'No conditions selected yet.'}
                                </p>
                            </li>
                        );
                    })}
                </ul>

            )}

            <Modal
                open={formOpen}
                onClose={closeForm}
                busy={isSaving}
                size="md"
                title={editing ? 'Edit child profile' : 'Add a child'}
            >
                <form onSubmit={handleSubmit} noValidate>

                    {formError && (
                        <p className="mb-4 text-[14px] font-medium text-[#d93025]" role="alert">{formError}</p>
                    )}

                    <ChildFormFields
                        values={form}
                        onChange={setForm}
                        errors={errors}
                        disabled={isSaving}
                        idPrefix="profile-child"
                        inactiveConditions={editing ? (editing.conditions || []).filter((c) => !c.is_active) : []}
                    />

                    <div className="sticky bottom-0 z-10 -mx-6 -mb-6 mt-6 flex justify-end gap-2.5 border-t border-[#eee] bg-white px-6 py-4 phone:-mx-4 phone:-mb-4 phone:flex-col-reverse phone:px-4 phone:[&>button]:w-full">
                        <button type="button" className={cancelClass} onClick={closeForm} disabled={isSaving}>
                            Cancel
                        </button>
                        <button type="submit" className={primaryClass} disabled={isSaving}>
                            {isSaving ? 'Saving...' : editing ? 'Save Changes' : 'Add Child'}
                        </button>
                    </div>

                </form>
            </Modal>

            <ConfirmDialog
                open={deleting !== null}
                title="Delete this child profile?"
                message={deleting ? `${deleting.name}'s profile will be removed. A profile with saved progress cannot be deleted.` : ''}
                confirmLabel="Delete"
                busyLabel="Deleting..."
                busy={isDeleting}
                onConfirm={handleDelete}
                onCancel={() => setDeleting(null)}
            />

        </section>
    );
}

export default ChildrenSection;
