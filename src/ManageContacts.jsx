import { useState, useEffect, useCallback, useRef } from 'react';
import { Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
    apiRequest,
    clearSession,
    mapValidationErrors,
} from './api.js';
import { TableSkeleton } from './Skeleton.jsx';
import { holdSkeleton } from './minLoading.js';
import * as ui from './adminClasses.js';
import Modal from './Modal.jsx';
import DeveloperTeamEditor from './DeveloperTeamEditor.jsx';

const emptyForm = {
    name: '',
    title: '',
    email: '',
    phone: '',
    description: '',
};

// Picture rules (the server checks again, from the file's real content).
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

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

    // Profile picture: the saved one (a URL), a newly chosen file waiting to be
    // uploaded with the form, and a flag to remove the saved one.
    const photoInputRef = useRef(null);
    const [savedPhotoUrl, setSavedPhotoUrl] = useState(null);
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [removePhoto, setRemovePhoto] = useState(false);
    const [photoError, setPhotoError] = useState('');

    const [confirmingId, setConfirmingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    // The Development Team card (separate from the professional contacts below):
    // its details are fetched fresh each time the editor is opened, so the form
    // always starts from what is saved. Saving is done by DeveloperTeamEditor.
    const [team, setTeam] = useState(null);
    const [teamOpen, setTeamOpen] = useState(false);
    const [teamOpening, setTeamOpening] = useState(false);
    const [teamSaving, setTeamSaving] = useState(false);


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
        const startedAt = performance.now();

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
                await holdSkeleton(startedAt, controller.signal);

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

    // Free the temporary preview of a chosen file when it is replaced or gone.
    useEffect(() => {
        if (!photoPreview) {
            return undefined;
        }

        return () => URL.revokeObjectURL(photoPreview);
    }, [photoPreview]);

    const resetPhoto = (savedUrl = null) => {
        setSavedPhotoUrl(savedUrl);
        setPhotoFile(null);
        setPhotoPreview(null);
        setRemovePhoto(false);
        setPhotoError('');
    };

    const handlePhotoSelected = (event) => {
        const file = event.target.files?.[0];

        // Let the same file be chosen again later.
        event.target.value = '';

        if (!file) {
            return;
        }

        if (!PHOTO_TYPES.includes(file.type)) {
            setPhotoError('Choose a JPG, PNG or WebP image.');
            return;
        }

        if (file.size > PHOTO_MAX_BYTES) {
            setPhotoError('The picture must be 2 MB or smaller.');
            return;
        }

        setPhotoError('');
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
        setRemovePhoto(false);
    };

    const handleRemovePhoto = () => {
        setPhotoFile(null);
        setPhotoPreview(null);
        setPhotoError('');
        setRemovePhoto(savedPhotoUrl !== null);
    };

    const closeForm = () => {
        resetPhoto();
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        setFieldErrors({});
        setFormError('');
    };

    const openCreateForm = () => {
        resetPhoto();
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
        resetPhoto(contact.photo_url || null);
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

            // The picture is sent after the details are saved (it is a file, so
            // it is a separate multipart request).
            const savedId = isEditing ? editingId : result.data.data.id;
            let photoProblem = '';

            if (photoFile) {
                const body = new FormData();

                body.append('photo', photoFile);

                const photoResult = await apiRequest(
                    `/admin/contacts/${savedId}/photo`,
                    { method: 'POST', body }
                );

                if (photoResult.status === 401) {
                    handleUnauthorized();
                    return;
                }

                if (!photoResult.ok) {
                    photoProblem =
                        photoResult.data.errors?.photo?.[0] ||
                        photoResult.data.message ||
                        `The picture could not be saved (server error ${photoResult.status}). Check that the server can accept uploads.`;
                }
            } else if (removePhoto && isEditing) {
                const photoResult = await apiRequest(
                    `/admin/contacts/${savedId}/photo`,
                    { method: 'DELETE' }
                );

                if (photoResult.status === 401) {
                    handleUnauthorized();
                    return;
                }

                if (!photoResult.ok) {
                    photoProblem = 'The picture could not be removed.';
                }
            }

            setNotice(
                photoProblem
                    ? {
                          type: 'error',
                          text: `The contact was saved, but: ${photoProblem} Edit the contact to try the picture again.`,
                      }
                    : {
                          type: 'success',
                          text: isEditing ? 'Contact updated.' : 'Contact added.',
                      }
            );
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


    const openTeamEditor = async () => {
        if (teamOpening) {
            return;
        }

        setTeamOpening(true);
        setNotice(null);

        try {
            const result = await apiRequest('/admin/developer-team');

            if (result.status === 401) {
                handleUnauthorized();
                return;
            }

            if (!result.ok || !result.data.data) {
                throw new Error(
                    result.status === 403
                        ? 'You do not have permission to edit the Development Team.'
                        : 'Unable to load the Development Team details.'
                );
            }

            setTeam(result.data.data);
            setTeamOpen(true);
        } catch (error) {
            setNotice({
                type: 'error',
                text:
                    error.message ||
                    'Unable to connect to the server. Please try again.',
            });
        } finally {
            setTeamOpening(false);
        }
    };


    return (
        <div className={ui.page}>

            <div className={ui.content}>

                <div className={ui.header}>

                    <div>

                        <h1 className={ui.title}>
                            Manage Contacts
                        </h1>

                        <p className={ui.subtitle}>
                            Professional contacts shown on the Contact Us
                            page.
                        </p>

                    </div>


                    <div className={ui.headerActions}>

                        <button
                            type="button"
                            className={ui.cancelButton}
                            onClick={() => reload(true)}
                            disabled={isLoading}
                        >
                            Refresh
                        </button>

                        <button
                            type="button"
                            className={ui.cancelButton}
                            onClick={openTeamEditor}
                            disabled={teamOpening}
                        >
                            Edit Development Team
                        </button>

                        <button
                            type="button"
                            className={ui.addButton}
                            onClick={handleToggleForm}
                        >
                            + Add Contact
                        </button>

                    </div>

                </div>


                {notice && (
                    <p
                        className={notice.type === 'error' ? ui.messageError : ui.messageSuccess}
                        role={notice.type === 'error' ? 'alert' : 'status'}
                    >
                        {notice.text}
                    </p>
                )}


                {/* Add / Edit Contact Form */}

                <Modal
                    open={showForm}
                    onClose={closeForm}
                    busy={isSaving}
                    size="lg"
                    title={editingId === null
                                ? 'Add New Contact'
                                : 'Edit Contact'}
                >

                    <form onSubmit={handleSubmit}>

                            {formError && (
                                <p className={ui.messageError} role="alert">
                                    {formError}
                                </p>
                            )}

                            <div className={ui.contactFormGrid}>

                                {/* Left column: profile picture */}

                                <div className="flex flex-col items-center gap-3">

                                    <span className={ui.label} id="contact-photo-label">
                                        Profile Picture
                                    </span>

                                    <button
                                        type="button"
                                        className={ui.avatarCircle}
                                        onClick={() => photoInputRef.current?.click()}
                                        disabled={isSaving}
                                        aria-labelledby="contact-photo-label contact-photo-prompt"
                                    >
                                        {photoPreview || (!removePhoto && savedPhotoUrl) ? (
                                            <img
                                                src={photoPreview || (!removePhoto && savedPhotoUrl)}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <span id="contact-photo-prompt" className="flex flex-col items-center gap-1 px-4 text-center text-[13px]">
                                                <Camera size={28} aria-hidden="true" />
                                                Choose a picture
                                            </span>
                                        )}
                                    </button>

                                    <input
                                        ref={photoInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        className="sr-only"
                                        tabIndex={-1}
                                        aria-hidden="true"
                                        onChange={handlePhotoSelected}
                                        disabled={isSaving}
                                    />

                                    <div className="flex flex-wrap justify-center gap-2">

                                        <button
                                            type="button"
                                            className={ui.fileRemove}
                                            onClick={() => photoInputRef.current?.click()}
                                            disabled={isSaving}
                                        >
                                            {photoPreview || (!removePhoto && savedPhotoUrl) ? 'Replace picture' : 'Choose picture'}
                                        </button>

                                        {(photoFile || (savedPhotoUrl && !removePhoto)) && (
                                            <button
                                                type="button"
                                                className={ui.fileRemove}
                                                onClick={handleRemovePhoto}
                                                disabled={isSaving}
                                            >
                                                Remove picture
                                            </button>
                                        )}

                                    </div>

                                    <p className={ui.fileHint}>
                                        JPG, PNG or WebP, up to 2 MB.
                                    </p>

                                    {photoError && (
                                        <p className={ui.fieldError} role="alert">
                                            {photoError}
                                        </p>
                                    )}

                                </div>


                                {/* Right column: contact details */}

                                <div>

                                <div className={ui.formGroup}>

                                    <label className={ui.label} htmlFor="contact-name">
                                        Name
                                    </label>

                                    <input className={ui.input}
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
                                        <p className={ui.fieldError}>
                                            {fieldErrors.name}
                                        </p>
                                    )}

                                </div>


                                <div className={ui.formGroup}>

                                    <label className={ui.label} htmlFor="contact-title">
                                        Title / Specialty
                                    </label>

                                    <input className={ui.input}
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
                                        <p className={ui.fieldError}>
                                            {fieldErrors.title}
                                        </p>
                                    )}

                                </div>


                                <div className={ui.formGroup}>

                                    <label className={ui.label} htmlFor="contact-email">
                                        Email (optional if a phone is given)
                                    </label>

                                    <input className={ui.input}
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
                                        <p className={ui.fieldError}>
                                            {fieldErrors.email}
                                        </p>
                                    )}

                                </div>


                                <div className={ui.formGroup}>

                                    <label className={ui.label} htmlFor="contact-phone">
                                        Phone (optional if an email is given)
                                    </label>

                                    <input className={ui.input}
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
                                        <p className={ui.fieldError}>
                                            {fieldErrors.phone}
                                        </p>
                                    )}

                                </div>


                                <div className={ui.formGroup}>

                                    <label className={ui.label} htmlFor="contact-description">
                                        Description (optional)
                                    </label>

                                    <textarea className={`${ui.activityTextarea} h-20`}
                                        id="contact-description"
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
                                        <p className={ui.fieldError}>
                                            {fieldErrors.description}
                                        </p>
                                    )}

                                </div>

                                </div>

                            </div>


                            <div className={ui.activityFormActions}>

                                <button
                                    type="button"
                                    className={ui.cancelButton}
                                    onClick={closeForm}
                                    disabled={isSaving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className={ui.saveButton}
                                    disabled={isSaving}
                                >
                                    {isSaving
                                        ? 'Saving...'
                                        : editingId === null
                                            ? 'Add Contact'
                                            : 'Save Changes'}
                                </button>

                            </div>

                        </form>

                </Modal>


                {/* Contacts Table */}

                {isLoading ? (

                    <TableSkeleton
                        label="Loading contacts..."
                        columns={['Name', 'Title / Specialty', 'Contact', 'Actions']}
                    />

                ) : loadError ? (

                    <div className={ui.listError} role="alert">

                        <p>
                            {loadError}
                        </p>

                        <button
                            type="button"
                            className={ui.cancelButton}
                            onClick={() => reload(true)}
                        >
                            Try again
                        </button>

                    </div>

                ) : (

                    <section className={ui.tableContainer}>

                        <table className={ui.table}>

                            <thead className={ui.thead}>

                                <tr>

                                    <th className={ui.th}>
                                        Name
                                    </th>

                                    <th className={ui.th}>
                                        Title / Specialty
                                    </th>

                                    <th className={ui.th}>
                                        Contact
                                    </th>

                                    <th className={ui.th}>
                                        Actions
                                    </th>

                                </tr>

                            </thead>


                            <tbody className={ui.tbody}>

                                {contacts.length === 0 && (

                                    <tr className={ui.row}>

                                        <td className={ui.tdEmpty} colSpan={4}>
                                            No contacts yet. Use
                                            &ldquo;+ Add Contact&rdquo; to
                                            add the first one.
                                        </td>

                                    </tr>

                                )}

                                {contacts.map((contact) => (

                                    <tr className={ui.row} key={contact.id}>

                                        <td className={ui.td} data-label="Name">

                                            {contact.name}

                                            {contact.description && (
                                                <div className={ui.cellSub}>
                                                    {contact.description}
                                                </div>
                                            )}

                                        </td>

                                        <td className={ui.td} data-label="Title / Specialty">
                                            {contact.title}
                                        </td>

                                        <td className={ui.td} data-label="Contact">

                                            {contact.email && (
                                                <div>{contact.email}</div>
                                            )}

                                            {contact.phone && (
                                                <div>{contact.phone}</div>
                                            )}

                                        </td>

                                        <td className={ui.td} data-label="Actions">

                                            {confirmingId === contact.id ? (

                                                <div className={ui.actions}>

                                                    <span className={ui.confirmText}>
                                                        Delete this contact?
                                                    </span>

                                                    <button
                                                        type="button"
                                                        className={ui.deleteButton}
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
                                                        className={ui.editButton}
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

                                                <div className={ui.actions}>

                                                    <button
                                                        type="button"
                                                        className={ui.editButton}
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
                                                        className={ui.deleteButton}
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


                {/* The existing Development Team editor (also used on the Contact Us page). */}
                {team && (
                    <Modal
                        open={teamOpen}
                        onClose={() => setTeamOpen(false)}
                        busy={teamSaving}
                        size="md"
                        title="Edit Development Team"
                    >
                        <DeveloperTeamEditor
                            team={team}
                            onBusyChange={setTeamSaving}
                            onCancel={() => setTeamOpen(false)}
                            onSaved={(saved) => {
                                setTeam(saved);
                                setTeamOpen(false);
                                setNotice({
                                    type: 'success',
                                    text: 'Development Team details saved.',
                                });
                            }}
                            onUnauthorized={handleUnauthorized}
                        />
                    </Modal>
                )}

            </div>

        </div>
    );
}

export default ManageContacts;
