import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, clearSession, mapValidationErrors } from './api.js';
import * as ui from './adminClasses.js';

const smallButton =
    'cursor-pointer rounded-full border border-edge-strong btn-glass px-3 py-1.5 [font-family:inherit] text-[12px] font-bold text-ink enabled:hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60';

/*
 * Admin management of the predefined conditions parents choose from (it opens in
 * a modal on the Manage Activities page). Conditions are never deleted: one that
 * is in use is switched off, which keeps every child's and activity's history
 * and only stops it being offered for new selections. The server checks the
 * admin role on every request.
 */
function ConditionsAdmin({ conditions, onSaved }) {
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [errors, setErrors] = useState({});
    const [busyId, setBusyId] = useState(null); // 'new' or a condition id
    const [notice, setNotice] = useState(null);

    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editErrors, setEditErrors] = useState({});

    const handleUnauthorized = () => {
        clearSession();
        navigate('/login', { replace: true, state: { message: 'Please log in to continue.' } });
    };

    // Runs a request and reports validation errors through setFieldErrors.
    const send = async (path, method, body, setFieldErrors) => {
        const result = await apiRequest(path, { method, body });

        if (result.status === 401) {
            handleUnauthorized();
            return null;
        }

        if (result.status === 422) {
            setFieldErrors(mapValidationErrors(result.data.errors));
            return null;
        }

        if (!result.ok) {
            throw new Error(result.data.message || 'Unable to save. Please try again.');
        }

        return result.data.data;
    };

    const handleAdd = async (event) => {
        event.preventDefault();

        if (busyId !== null) {
            return;
        }

        setBusyId('new');
        setErrors({});
        setNotice(null);

        try {
            const saved = await send(
                '/admin/conditions',
                'POST',
                { name: name.trim(), description: description.trim() || null },
                setErrors
            );

            if (saved) {
                onSaved(saved);
                setName('');
                setDescription('');
                setNotice({ type: 'success', text: 'Condition added.' });
            }
        } catch (error) {
            setNotice({ type: 'error', text: error.message || 'Unable to connect to the server.' });
        } finally {
            setBusyId(null);
        }
    };

    const startEdit = (condition) => {
        setEditingId(condition.id);
        setEditName(condition.name);
        setEditDescription(condition.description || '');
        setEditErrors({});
    };

    const handleEditSave = async (condition) => {
        if (busyId !== null) {
            return;
        }

        setBusyId(condition.id);
        setEditErrors({});
        setNotice(null);

        try {
            const saved = await send(
                `/admin/conditions/${condition.id}`,
                'PUT',
                { name: editName.trim(), description: editDescription.trim() || null },
                setEditErrors
            );

            if (saved) {
                onSaved(saved);
                setEditingId(null);
            }
        } catch (error) {
            setNotice({ type: 'error', text: error.message || 'Unable to connect to the server.' });
        } finally {
            setBusyId(null);
        }
    };

    const toggleActive = async (condition) => {
        if (busyId !== null) {
            return;
        }

        setBusyId(condition.id);
        setNotice(null);

        try {
            const saved = await send(
                `/admin/conditions/${condition.id}`,
                'PUT',
                { is_active: !condition.is_active },
                () => {}
            );

            if (saved) {
                onSaved(saved);
            }
        } catch (error) {
            setNotice({ type: 'error', text: error.message || 'Unable to connect to the server.' });
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div>

            <p className={ui.fileHint}>
                Parents pick these for their child (they are parent-reported, not diagnoses), and
                activities are matched to them. A condition is switched off, not deleted, so
                existing children and activities keep their history.
            </p>

            {notice && (
                <p
                    className={notice.type === 'error' ? ui.messageError : ui.messageSuccess}
                    role={notice.type === 'error' ? 'alert' : 'status'}
                >
                    {notice.text}
                </p>
            )}

            <form onSubmit={handleAdd} className="mb-6 rounded-lg border border-edge bg-warm p-4" noValidate>

                <h3 className="mb-3 text-[15px] font-bold text-ink">Add a condition</h3>

                <div className={ui.formGroup}>
                    <label className={ui.label} htmlFor="condition-name">Name</label>
                    <input
                        className={ui.input}
                        id="condition-name"
                        type="text"
                        value={name}
                        maxLength={255}
                        onChange={(event) => setName(event.target.value)}
                        disabled={busyId !== null}
                    />
                    {errors.name && <p className={ui.fieldError}>{errors.name}</p>}
                </div>

                <div className={ui.formGroup}>
                    <label className={ui.label} htmlFor="condition-description">Description (optional)</label>
                    <input
                        className={ui.input}
                        id="condition-description"
                        type="text"
                        value={description}
                        maxLength={2000}
                        onChange={(event) => setDescription(event.target.value)}
                        disabled={busyId !== null}
                    />
                    {errors.description && <p className={ui.fieldError}>{errors.description}</p>}
                </div>

                <button type="submit" className={ui.saveButton} disabled={busyId !== null}>
                    {busyId === 'new' ? 'Adding...' : 'Add Condition'}
                </button>

            </form>

            {conditions.length === 0 ? (

                <p className={ui.fileHint}>No conditions yet. Add the first one above.</p>

            ) : (

                <ul className="flex list-none flex-col gap-2">
                    {conditions.map((condition) => (
                        <li
                            key={condition.id}
                            className={`rounded-lg border border-edge p-3 ${condition.is_active ? 'bg-white' : 'bg-sunken'}`}
                        >
                            {editingId === condition.id ? (

                                <div>
                                    <div className={ui.formGroup}>
                                        <label className={ui.label} htmlFor={`condition-edit-name-${condition.id}`}>Name</label>
                                        <input
                                            className={ui.input}
                                            id={`condition-edit-name-${condition.id}`}
                                            type="text"
                                            value={editName}
                                            maxLength={255}
                                            onChange={(event) => setEditName(event.target.value)}
                                            disabled={busyId !== null}
                                        />
                                        {editErrors.name && <p className={ui.fieldError}>{editErrors.name}</p>}
                                    </div>
                                    <div className={ui.formGroup}>
                                        <label className={ui.label} htmlFor={`condition-edit-desc-${condition.id}`}>Description</label>
                                        <input
                                            className={ui.input}
                                            id={`condition-edit-desc-${condition.id}`}
                                            type="text"
                                            value={editDescription}
                                            maxLength={2000}
                                            onChange={(event) => setEditDescription(event.target.value)}
                                            disabled={busyId !== null}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="button" className={smallButton} onClick={() => handleEditSave(condition)} disabled={busyId !== null}>
                                            {busyId === condition.id ? 'Saving...' : 'Save'}
                                        </button>
                                        <button type="button" className={smallButton} onClick={() => setEditingId(null)} disabled={busyId !== null}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>

                            ) : (

                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-[15px] font-bold text-ink [overflow-wrap:anywhere]">
                                            {condition.name}
                                            {!condition.is_active && (
                                                <span className="ml-2 rounded-xl bg-edge px-2 py-0.5 align-middle text-[11px] font-bold text-muted">
                                                    Switched off
                                                </span>
                                            )}
                                        </p>
                                        {condition.description && (
                                            <p className="mt-0.5 text-[13px] text-muted [overflow-wrap:anywhere]">{condition.description}</p>
                                        )}
                                        <p className="mt-1 text-[12px] text-faint">
                                            Used by {condition.children_count} {condition.children_count === 1 ? 'child' : 'children'} and{' '}
                                            {condition.activities_count} {condition.activities_count === 1 ? 'activity' : 'activities'}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="button" className={smallButton} onClick={() => startEdit(condition)} disabled={busyId !== null}>
                                            Edit
                                        </button>
                                        <button type="button" className={smallButton} onClick={() => toggleActive(condition)} disabled={busyId !== null}>
                                            {busyId === condition.id ? 'Saving...' : condition.is_active ? 'Switch off' : 'Switch on'}
                                        </button>
                                    </div>
                                </div>

                            )}
                        </li>
                    ))}
                </ul>

            )}

        </div>
    );
}

export default ConditionsAdmin;
