import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    apiRequest,
    clearSession,
    mapValidationErrors,
} from './api.js';
import { TableSkeleton } from './Skeleton.jsx';
import './css/ManageActivities.css';
import './css/ManageContacts.css';

const emptyForm = {
    name: '',
    title: '',
    email: '',
    phone: '',
    description: '',
};

function ManageContacts() {

    const navigate = useNavigate();

    const [contacts, setContacts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    const [notice, setNotice] = useState(null);

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [confirmingId, setConfirmingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);


    // Expired or invalid token: clear it and go to the login page.
    const handleUnauthorized = useCallback(() => {
        clearSession();

        navigate('/login', {
            replace: true,
            state: { message: 'Please log in to continue.' },
        });
    }, [navigate]);


    // Fetch the list whenever reloadKey changes.
    useEffect(() => {
        const controller = new AbortController();

        const loadContacts = async () => {
            try {
                const result = await apiRequest('/admin/contacts', {
                    signal: controller.signal,
                });

                if (result.status === 401) {
                    handleUnauthorized();
                    return;
                }

                if (result.status === 403) {
                    throw new Error(
                        'You do not have permission to manage contacts.'
                    );
                }

                if (!result.ok) {
                    throw new Error('Unable to load contacts.');
                }

                setContacts(
                    Array.isArray(result.data.data) ? result.data.data : []
                );
                setLoadError('');
            } catch (error) {
                if (error.name === 'AbortError') {
                    return;
                }

                setLoadError(
                    error.message ||
                    'Unable to connect to the server. Please try again.'
                );
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        loadContacts();

        return () => controller.abort();
    }, [reloadKey, handleUnauthorized]);


    // showSpinner = false refreshes quietly after a save or delete.
    const reload = (showSpinner = true) => {
        if (showSpinner) {
            setIsLoading(true);
        }

        setLoadError('');
        setReloadKey((key) => key + 1);
    };


    const updateField = (name, value) => {
        setForm((current) => ({ ...current, [name]: value }));
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        setFieldErrors({});
        setFormError('');
    };

    const openCreateForm = () => {
        setNotice(null);
        setConfirmingId(null);
        setEditingId(null);
        setForm(emptyForm);
        setFieldErrors({});
        setFormError('');
        setShowForm(true);
    };

    const handleToggleForm = () => {
        if (showForm && editingId === null) {
            closeForm();
        } else {
            openCreateForm();
        }
    };

    // The list already holds every field, so no extra request is needed.
    const handleEdit = (contact) => {
        setNotice(null);
        setConfirmingId(null);
        setForm({
            name: contact.name || '',
            title: contact.title || '',
            email: contact.email || '',
            phone: contact.phone || '',
            description: contact.description || '',
        });
        setEditingId(contact.id);
        setFieldErrors({});
        setFormError('');
        setShowForm(true);
    };


    const handleSubmit = async (event) => {
        event.preventDefault();

        if (isSaving) {
            return;
        }

        const payload = {
            name: form.name.trim(),
            title: form.title.trim(),
            email: form.email.trim() || null,
            phone: form.phone.trim() || null,
            description: form.description.trim() || null,
        };

        // Quick check for the "email or phone" rule. Laravel stays the
        // authority and repeats every check.
        if (!payload.email && !payload.phone) {
            const message = 'Provide an email address or a phone number.';

            setFieldErrors({ email: message, phone: message });
            setFormError('Please fix the highlighted fields.');
            return;
        }

        const isEditing = editingId !== null;

        setIsSaving(true);
        setFieldErrors({});
        setFormError('');
        setNotice(null);

        try {
            const result = await apiRequest(
                isEditing
                    ? `/admin/contacts/${editingId}`
                    : '/admin/contacts',
                { method: isEditing ? 'PUT' : 'POST', body: payload }
            );

            if (result.status === 401) {
                handleUnauthorized();
                return;
            }

            if (result.status === 422) {
                setFieldErrors(mapValidationErrors(result.data.errors));
                setFormError('Please fix the highlighted fields.');
                return;
            }

            if (result.status === 404) {
                closeForm();
                setNotice({
                    type: 'error',
                    text: 'This contact no longer exists. The list was refreshed.',
                });
                reload(false);
                return;
            }

            if (!result.ok) {
                throw new Error(
                    result.data.message ||
                    'Unable to save the contact. Please try again.'
                );
            }

            setNotice({
                type: 'success',
                text: isEditing ? 'Contact updated.' : 'Contact added.',
            });
            closeForm();
            reload(false);
        } catch (error) {
            // The typed values stay in the form so they can be corrected.
            setFormError(
                error.message ||
                'Unable to connect to the server. Please try again.'
            );
        } finally {
            setIsSaving(false);
        }
    };


    const handleDelete = async (contact) => {
        if (deletingId !== null) {
            return;
        }

        setNotice(null);
        setDeletingId(contact.id);

        try {
            const result = await apiRequest(
                `/admin/contacts/${contact.id}`,
                { method: 'DELETE' }
            );

            if (result.status === 401) {
                handleUnauthorized();
                return;
            }

            // 404 means it was already removed; either way the list is stale.
            if (!result.ok && result.status !== 404) {
                throw new Error(
                    result.data.message ||
                    'Unable to delete the contact. Please try again.'
                );
            }

            if (editingId === contact.id) {
                closeForm();
            }

            setNotice({
                type: 'success',
                text: `"${contact.name}" deleted.`,
            });
            reload(false);
        } catch (error) {
            setNotice({
                type: 'error',
                text:
                    error.message ||
                    'Unable to connect to the server. Please try again.',
            });
        } finally {
            setConfirmingId(null);
            setDeletingId(null);
        }
    };


    return (
        <div className="manage-activities-page">

            <main className="manage-activities-content">

                <div className="page-header">

                    <div>

                        <h1>
                            Manage Contacts
                        </h1>

                        <p>
                            Professional contacts shown on the Contact Us
                            page.
                        </p>

                    </div>


                    <div className="header-actions">

                        <button
                            type="button"
                            className="cancel-button"
                            onClick={() => reload(true)}
                            disabled={isLoading}
                        >
                            Refresh
                        </button>

                        <button
                            type="button"
                            className="add-activity-button"
                            onClick={handleToggleForm}
                        >
                            + Add Contact
                        </button>

                    </div>

                </div>


                {notice && (
                    <p
                        className={`page-message ${notice.type}`}
                        role={notice.type === 'error' ? 'alert' : 'status'}
                    >
                        {notice.text}
                    </p>
                )}


                {/* Add / Edit Contact Form */}

                {showForm && (

                    <section className="activity-form">

                        <h2>
                            {editingId === null
                                ? 'Add New Contact'
                                : 'Edit Contact'}
                        </h2>


                        <form onSubmit={handleSubmit}>

                            {formError && (
                                <p className="page-message error" role="alert">
                                    {formError}
                                </p>
                            )}

                            <div className="form-group">

                                <label htmlFor="contact-name">
                                    Name
                                </label>

                                <input
                                    id="contact-name"
                                    type="text"
                                    placeholder="Enter full name"
                                    value={form.name}
                                    maxLength={255}
                                    onChange={(event) =>
                                        updateField('name', event.target.value)
                                    }
                                    required
                                />

                                {fieldErrors.name && (
                                    <p className="field-error">
                                        {fieldErrors.name}
                                    </p>
                                )}

                            </div>


                            <div className="form-group">

                                <label htmlFor="contact-title">
                                    Title / Specialty
                                </label>

                                <input
                                    id="contact-title"
                                    type="text"
                                    placeholder="e.g. Occupational Therapist"
                                    value={form.title}
                                    maxLength={255}
                                    onChange={(event) =>
                                        updateField('title', event.target.value)
                                    }
                                    required
                                />

                                {fieldErrors.title && (
                                    <p className="field-error">
                                        {fieldErrors.title}
                                    </p>
                                )}

                            </div>


                            <div className="form-group">

                                <label htmlFor="contact-email">
                                    Email (optional if a phone is given)
                                </label>

                                <input
                                    id="contact-email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={form.email}
                                    maxLength={255}
                                    onChange={(event) =>
                                        updateField('email', event.target.value)
                                    }
                                />

                                {fieldErrors.email && (
                                    <p className="field-error">
                                        {fieldErrors.email}
                                    </p>
                                )}

                            </div>


                            <div className="form-group">

                                <label htmlFor="contact-phone">
                                    Phone (optional if an email is given)
                                </label>

                                <input
                                    id="contact-phone"
                                    type="tel"
                                    placeholder="+63 917 123 4567"
                                    value={form.phone}
                                    maxLength={30}
                                    onChange={(event) =>
                                        updateField('phone', event.target.value)
                                    }
                                />

                                {fieldErrors.phone && (
                                    <p className="field-error">
                                        {fieldErrors.phone}
                                    </p>
                                )}

                            </div>


                            <div className="form-group">

                                <label htmlFor="contact-description">
                                    Description (optional)
                                </label>

                                <textarea
                                    id="contact-description"
                                    rows={3}
                                    placeholder="Short note about this professional"
                                    value={form.description}
                                    maxLength={5000}
                                    onChange={(event) =>
                                        updateField(
                                            'description',
                                            event.target.value
                                        )
                                    }
                                />

                                {fieldErrors.description && (
                                    <p className="field-error">
                                        {fieldErrors.description}
                                    </p>
                                )}

                            </div>


                            <div className="form-actions">

                                <button
                                    type="submit"
                                    className="save-button"
                                    disabled={isSaving}
                                >
                                    {isSaving
                                        ? 'Saving...'
                                        : editingId === null
                                            ? 'Add Contact'
                                            : 'Save Changes'}
                                </button>

                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={closeForm}
                                    disabled={isSaving}
                                >
                                    Cancel
                                </button>

                            </div>

                        </form>

                    </section>

                )}


                {/* Contacts Table */}

                {isLoading ? (

                    <TableSkeleton
                        label="Loading contacts..."
                        columns={['Name', 'Title / Specialty', 'Contact', 'Actions']}
                    />

                ) : loadError ? (

                    <div className="list-state list-error" role="alert">

                        <p>
                            {loadError}
                        </p>

                        <button
                            type="button"
                            className="cancel-button"
                            onClick={() => reload(true)}
                        >
                            Try again
                        </button>

                    </div>

                ) : (

                    <section className="activities-table-container">

                        <table className="activities-table">

                            <thead>

                                <tr>

                                    <th>
                                        Name
                                    </th>

                                    <th>
                                        Title / Specialty
                                    </th>

                                    <th>
                                        Contact
                                    </th>

                                    <th>
                                        Actions
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {contacts.length === 0 && (

                                    <tr>

                                        <td colSpan={4}>
                                            No contacts yet. Use
                                            &ldquo;+ Add Contact&rdquo; to
                                            add the first one.
                                        </td>

                                    </tr>

                                )}

                                {contacts.map((contact) => (

                                    <tr key={contact.id}>

                                        <td data-label="Name">

                                            {contact.name}

                                            {contact.description && (
                                                <div className="cell-sub">
                                                    {contact.description}
                                                </div>
                                            )}

                                        </td>

                                        <td data-label="Title / Specialty">
                                            {contact.title}
                                        </td>

                                        <td data-label="Contact">

                                            {contact.email && (
                                                <div>{contact.email}</div>
                                            )}

                                            {contact.phone && (
                                                <div>{contact.phone}</div>
                                            )}

                                        </td>

                                        <td data-label="Actions">

                                            {confirmingId === contact.id ? (

                                                <div className="table-actions">

                                                    <span className="confirm-text">
                                                        Delete this contact?
                                                    </span>

                                                    <button
                                                        type="button"
                                                        className="delete-button"
                                                        onClick={() =>
                                                            handleDelete(contact)
                                                        }
                                                        disabled={
                                                            deletingId !== null
                                                        }
                                                    >
                                                        {deletingId === contact.id
                                                            ? 'Deleting...'
                                                            : 'Yes, delete'}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="edit-button"
                                                        onClick={() =>
                                                            setConfirmingId(null)
                                                        }
                                                        disabled={
                                                            deletingId !== null
                                                        }
                                                    >
                                                        Cancel
                                                    </button>

                                                </div>

                                            ) : (

                                                <div className="table-actions">

                                                    <button
                                                        type="button"
                                                        className="edit-button"
                                                        aria-label={`Edit ${contact.name}`}
                                                        onClick={() =>
                                                            handleEdit(contact)
                                                        }
                                                        disabled={
                                                            deletingId !== null
                                                        }
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="delete-button"
                                                        aria-label={`Delete ${contact.name}`}
                                                        onClick={() =>
                                                            setConfirmingId(
                                                                contact.id
                                                            )
                                                        }
                                                        disabled={
                                                            deletingId !== null
                                                        }
                                                    >
                                                        Delete
                                                    </button>

                                                </div>

                                            )}

                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    </section>

                )}

            </main>

        </div>
    );
}

export default ManageContacts;
