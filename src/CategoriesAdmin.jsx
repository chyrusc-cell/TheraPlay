import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, clearSession, mapValidationErrors } from './api.js';
import * as ui from './adminClasses.js';

const smallButton =
    'cursor-pointer rounded-full border border-edge-strong btn-glass px-3 py-1.5 [font-family:inherit] text-[12px] font-bold text-ink enabled:hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60';

/*
 * Admin management of the activity categories (it opens in a modal on the Manage
 * Activities page). A category that still has activities cannot be deleted; the
 * server refuses it and says why, so no activity is ever left without the
 * category it was given. The server checks the admin role on every request.
 */
function CategoriesAdmin({ categories, onSaved, onDeleted }) {
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [errors, setErrors] = useState({});
    const [busyId, setBusyId] = useState(null); // 'new' or a category id
    const [notice, setNotice] = useState(null);

    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editErrors, setEditErrors] = useState({});
    const [confirmingId, setConfirmingId] = useState(null);

    // Runs a request and reports validation errors through setFieldErrors.
    const send = async (path, method, body, setFieldErrors) => {
        const result = await apiRequest(path, { method, body });

        if (result.status === 401) {
            clearSession();
            navigate('/login', { replace: true, state: { message: 'Please log in to continue.' } });
            return null;
        }

        if (result.status === 422) {
            setFieldErrors(mapValidationErrors(result.data.errors));
            return null;
        }

        if (!result.ok) {
            throw new Error(result.data.message || 'Unable to save. Please try again.');
        }

        return result.data;
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
                '/admin/categories',
                'POST',
                { name: name.trim(), description: description.trim() || null },
                setErrors
            );

            if (saved) {
                onSaved(saved.data);
                setName('');
                setDescription('');
                setNotice({ type: 'success', text: 'Category added.' });
            }
        } catch (error) {
            setNotice({ type: 'error', text: error.message || 'Unable to connect to the server.' });
        } finally {
            setBusyId(null);
        }
    };

    const startEdit = (category) => {
        setEditingId(category.id);
        setEditName(category.name);
        setEditDescription(category.description || '');
        setEditErrors({});
        setConfirmingId(null);
    };

    const handleEditSave = async (category) => {
        if (busyId !== null) {
            return;
        }

        setBusyId(category.id);
        setEditErrors({});
        setNotice(null);

        try {
            const saved = await send(
                `/admin/categories/${category.id}`,
                'PUT',
                { name: editName.trim(), description: editDescription.trim() || null },
                setEditErrors
            );

            if (saved) {
                onSaved(saved.data);
                setEditingId(null);
            }
        } catch (error) {
            setNotice({ type: 'error', text: error.message || 'Unable to connect to the server.' });
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async (category) => {
        if (busyId !== null) {
            return;
        }

        setBusyId(category.id);
        setNotice(null);

        try {
            const done = await send(`/admin/categories/${category.id}`, 'DELETE', undefined, () => {});

            if (done) {
                onDeleted(category.id);
                setNotice({ type: 'success', text: 'Category deleted.' });
            }
        } catch (error) {
            setNotice({ type: 'error', text: error.message || 'Unable to connect to the server.' });
        } finally {
            setConfirmingId(null);
            setBusyId(null);
        }
    };

    return (
        <div>

            <p className={ui.fileHint}>
                Categories group activities and are the choices in the Category filter parents see.
                A category that still has activities cannot be deleted. Rename it, or move its
                activities to another category first.
            </p>

            {notice && (
                <p
                    className={notice.type === 'error' ? ui.messageError : ui.messageSuccess}
                    role={notice.type === 'error' ? 'alert' : 'status'}
                >
                    {notice.text}
                </p>
            )}

            <form onSubmit={handleAdd} className="mb-6 rounded-lg border border-edge card-soft p-4" noValidate>

                <h3 className="mb-3 text-[15px] font-bold text-ink">Add a category</h3>

                <div className={ui.formGroup}>
                    <label className={ui.label} htmlFor="category-name">Name</label>
                    <input
                        className={ui.input}
                        id="category-name"
                        type="text"
                        value={name}
                        maxLength={255}
                        onChange={(event) => setName(event.target.value)}
                        disabled={busyId !== null}
                    />
                    {errors.name && <p className={ui.fieldError}>{errors.name}</p>}
                </div>

                <div className={ui.formGroup}>
                    <label className={ui.label} htmlFor="category-description">Description (optional)</label>
                    <input
                        className={ui.input}
                        id="category-description"
                        type="text"
                        value={description}
                        maxLength={2000}
                        onChange={(event) => setDescription(event.target.value)}
                        disabled={busyId !== null}
                    />
                    {errors.description && <p className={ui.fieldError}>{errors.description}</p>}
                </div>

                <button type="submit" className={ui.saveButton} disabled={busyId !== null}>
                    {busyId === 'new' ? 'Adding...' : 'Add Category'}
                </button>

            </form>

            {categories.length === 0 ? (

                <p className={ui.fileHint}>No categories yet. Add the first one above.</p>

            ) : (

                <ul className="flex list-none flex-col gap-2">
                    {categories.map((category) => (
                        <li key={category.id} className="rounded-lg border border-edge bg-white card-soft p-3">
                            {editingId === category.id ? (

                                <div>
                                    <div className={ui.formGroup}>
                                        <label className={ui.label} htmlFor={`category-edit-name-${category.id}`}>Name</label>
                                        <input
                                            className={ui.input}
                                            id={`category-edit-name-${category.id}`}
                                            type="text"
                                            value={editName}
                                            maxLength={255}
                                            onChange={(event) => setEditName(event.target.value)}
                                            disabled={busyId !== null}
                                        />
                                        {editErrors.name && <p className={ui.fieldError}>{editErrors.name}</p>}
                                    </div>
                                    <div className={ui.formGroup}>
                                        <label className={ui.label} htmlFor={`category-edit-desc-${category.id}`}>Description</label>
                                        <input
                                            className={ui.input}
                                            id={`category-edit-desc-${category.id}`}
                                            type="text"
                                            value={editDescription}
                                            maxLength={2000}
                                            onChange={(event) => setEditDescription(event.target.value)}
                                            disabled={busyId !== null}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="button" className={smallButton} onClick={() => handleEditSave(category)} disabled={busyId !== null}>
                                            {busyId === category.id ? 'Saving...' : 'Save'}
                                        </button>
                                        <button type="button" className={smallButton} onClick={() => setEditingId(null)} disabled={busyId !== null}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>

                            ) : (

                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-[15px] font-bold text-ink [overflow-wrap:anywhere]">{category.name}</p>
                                        {category.description && (
                                            <p className="mt-0.5 text-[13px] text-muted [overflow-wrap:anywhere]">{category.description}</p>
                                        )}
                                        <p className="mt-1 text-[12px] text-muted">
                                            Used by {category.activities_count} {category.activities_count === 1 ? 'activity' : 'activities'}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {confirmingId === category.id ? (
                                            <>
                                                <button type="button" className={smallButton} onClick={() => handleDelete(category)} disabled={busyId !== null}>
                                                    {busyId === category.id ? 'Deleting...' : `Confirm delete ${category.name}`}
                                                </button>
                                                <button type="button" className={smallButton} onClick={() => setConfirmingId(null)} disabled={busyId !== null}>
                                                    Keep
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button type="button" className={smallButton} onClick={() => startEdit(category)} disabled={busyId !== null}>
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    className={smallButton}
                                                    onClick={() => setConfirmingId(category.id)}
                                                    disabled={busyId !== null || category.activities_count > 0}
                                                    title={category.activities_count > 0 ? 'In use by activities, so it cannot be deleted' : undefined}
                                                >
                                                    Delete
                                                </button>
                                            </>
                                        )}
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

export default CategoriesAdmin;
