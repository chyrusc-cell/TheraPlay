import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, clearSession, mapValidationErrors } from './api.js';
import * as ui from './adminClasses.js';

const smallButton =
    'cursor-pointer rounded-xl border btn-glass px-3 py-1.5 [font-family:inherit] text-[12px] font-bold text-ink enabled:hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60';

/*
 * Admin view of the activity categories (it opens in a modal on the Manage
 * Activities page). The six categories are a fixed set: they cannot be added,
 * renamed or deleted, only their description can be edited. The server enforces
 * this and checks the admin role on every request.
 */
function CategoriesAdmin({ categories, onSaved }) {
    const navigate = useNavigate();

    const [busyId, setBusyId] = useState(null);
    const [notice, setNotice] = useState(null);

    const [editingId, setEditingId] = useState(null);
    const [editDescription, setEditDescription] = useState('');
    const [editErrors, setEditErrors] = useState({});

    const startEdit = (category) => {
        setEditingId(category.id);
        setEditDescription(category.description || '');
        setEditErrors({});
        setNotice(null);
    };

    const handleEditSave = async (category) => {
        if (busyId !== null) {
            return;
        }

        setBusyId(category.id);
        setEditErrors({});
        setNotice(null);

        try {
            // The name is sent unchanged: the server refuses to rename a category.
            const result = await apiRequest(`/admin/categories/${category.id}`, {
                method: 'PUT',
                body: { name: category.name, description: editDescription.trim() || null },
            });

            if (result.status === 401) {
                clearSession();
                navigate('/login', { replace: true, state: { message: 'Please log in to continue.' } });
                return;
            }

            if (result.status === 422) {
                setEditErrors(mapValidationErrors(result.data.errors));
                return;
            }

            if (!result.ok) {
                throw new Error(result.data.message || 'Unable to save. Please try again.');
            }

            onSaved(result.data.data);
            setEditingId(null);
        } catch (error) {
            setNotice({ type: 'error', text: error.message || 'Unable to connect to the server.' });
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div>

            <p className={ui.fileHint}>
                These six categories group the activities and are the choices in the Category filter
                parents see. Their names are fixed; you can edit each description.
            </p>

            {notice && (
                <p className={ui.messageError} role="alert">
                    {notice.text}
                </p>
            )}

            {categories.length === 0 ? (

                <p className={ui.fileHint}>No categories were found.</p>

            ) : (

                <ul className="flex list-none flex-col gap-2">
                    {categories.map((category) => (
                        <li key={category.id} className="rounded-lg border border-edge bg-white card-soft p-3">
                            {editingId === category.id ? (

                                <div>
                                    <p className="mb-2 text-[15px] font-bold text-ink [overflow-wrap:anywhere]">{category.name}</p>
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
                                        {editErrors.description && <p className={ui.fieldError}>{editErrors.description}</p>}
                                        {editErrors.name && <p className={ui.fieldError}>{editErrors.name}</p>}
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
                                        <button type="button" className={smallButton} onClick={() => startEdit(category)} disabled={busyId !== null}>
                                            Edit
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

export default CategoriesAdmin;
