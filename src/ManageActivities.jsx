import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    apiRequest,
    clearSession,
    mapValidationErrors,
} from './api.js';
import { TableSkeleton } from './Skeleton.jsx';
import { difficultyBadgeTw } from './uiHelpers.js';
import * as ui from './adminClasses.js';

// Uploads: the server checks everything again; these only give quick feedback.
const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'pptx', 'png', 'jpg', 'jpeg', 'txt'];
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 10;

const formatSize = (bytes) =>
    bytes >= 1024 * 1024
        ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// One item per line in the form <-> an array for the API.
const linesToArray = (text) =>
    text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

const arrayToLines = (items) =>
    Array.isArray(items) ? items.join('\n') : '';

const emptyForm = {
    title: '',
    categoryId: '',
    difficulty: 'Easy',
    description: '',
    objective: '',
    instructions: '',
    materials: '',
};

function ManageActivities() {

    const navigate = useNavigate();

    const [activities, setActivities] = useState([]);
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

    const [loadingEditId, setLoadingEditId] = useState(null);
    const [busyId, setBusyId] = useState(null);

    // File materials: files chosen but not saved yet, files already saved on
    // the server, and the state of the remove-file confirmation.
    const [pendingFiles, setPendingFiles] = useState([]);
    const [existingResources, setExistingResources] = useState([]);
    const [fileErrors, setFileErrors] = useState([]);
    const [fileInputKey, setFileInputKey] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [confirmingResourceId, setConfirmingResourceId] = useState(null);
    const [removingResourceId, setRemovingResourceId] = useState(null);


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

        const loadActivities = async () => {
            try {
                const result = await apiRequest('/admin/activities', {
                    signal: controller.signal,
                });

                if (result.status === 401) {
                    handleUnauthorized();
                    return;
                }

                if (result.status === 403) {
                    throw new Error(
                        'You do not have permission to manage activities.'
                    );
                }

                if (!result.ok) {
                    throw new Error('Unable to load activities.');
                }

                setActivities(
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

        loadActivities();

        return () => controller.abort();
    }, [reloadKey, handleUnauthorized]);


    // showSpinner = false refreshes quietly after a save or publish action.
    const reload = (showSpinner = true) => {
        if (showSpinner) {
            setIsLoading(true);
        }

        setLoadError('');
        setReloadKey((key) => key + 1);
    };


    // The API only accepts an existing category id, and there is no category
    // endpoint yet, so the choices are the categories already in use.
    const categories = useMemo(() => {
        const found = new Map();

        activities.forEach((activity) => {
            if (activity.category_id && activity.category) {
                found.set(activity.category_id, activity.category);
            }
        });

        return [...found.entries()].map(([id, name]) => ({ id, name }));
    }, [activities]);


    const updateField = (name, value) => {
        setForm((current) => ({ ...current, [name]: value }));
    };

    const resetFiles = () => {
        setPendingFiles([]);
        setExistingResources([]);
        setFileErrors([]);
        setConfirmingResourceId(null);
        setFileInputKey((key) => key + 1);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        setFieldErrors({});
        setFormError('');
        resetFiles();
    };

    const openCreateForm = () => {
        setNotice(null);
        setEditingId(null);
        setForm(emptyForm);
        setFieldErrors({});
        setFormError('');
        resetFiles();
        setShowForm(true);
    };


    // Quick checks so obvious mistakes are caught before uploading. The
    // server repeats every check and decides what is accepted.
    const handleFilesSelected = (event) => {
        const chosen = Array.from(event.target.files || []);
        const problems = [];
        const accepted = [...pendingFiles];

        chosen.forEach((file) => {
            const extension = file.name.split('.').pop().toLowerCase();

            if (!ALLOWED_EXTENSIONS.includes(extension)) {
                problems.push(`"${file.name}" is not a supported type.`);
            } else if (file.size > MAX_FILE_BYTES) {
                problems.push(
                    `"${file.name}" is larger than ${MAX_FILE_BYTES / (1024 * 1024)} MB.`
                );
            } else if (
                accepted.some(
                    (item) => item.name === file.name && item.size === file.size
                )
            ) {
                problems.push(`"${file.name}" is already selected.`);
            } else if (accepted.length >= MAX_FILES) {
                problems.push(`You can upload at most ${MAX_FILES} files at once.`);
            } else {
                accepted.push(file);
            }
        });

        setPendingFiles(accepted);
        setFileErrors(problems);

        // Clear the picker so the same file can be chosen again later.
        setFileInputKey((key) => key + 1);
    };

    const handleRemovePendingFile = (index) => {
        setPendingFiles((files) => files.filter((_, i) => i !== index));
        setFileErrors([]);
    };

    // Removes a file that is already saved on the server.
    const handleRemoveResource = async (resource) => {
        if (removingResourceId !== null) {
            return;
        }

        setRemovingResourceId(resource.id);
        setFileErrors([]);

        try {
            const result = await apiRequest(
                `/admin/activities/${editingId}/resources/${resource.id}`,
                { method: 'DELETE' }
            );

            if (result.status === 401) {
                handleUnauthorized();
                return;
            }

            // 404 means it is already gone, so the list is simply refreshed.
            if (!result.ok && result.status !== 404) {
                throw new Error(
                    result.data.message || 'Unable to remove the file.'
                );
            }

            setExistingResources((items) =>
                items.filter((item) => item.id !== resource.id)
            );
            setNotice({
                type: 'success',
                text: `"${resource.file_name}" was removed.`,
            });
            reload(false);
        } catch (error) {
            setFileErrors([
                error.message ||
                'Unable to connect to the server. Please try again.',
            ]);
        } finally {
            setConfirmingResourceId(null);
            setRemovingResourceId(null);
        }
    };

    // Sends the chosen files as multipart form data. No Content-Type header is
    // set by hand: the browser adds it together with the multipart boundary.
    const uploadFiles = async (activityId) => {
        const data = new FormData();

        pendingFiles.forEach((file) => data.append('files[]', file));

        const result = await apiRequest(
            `/admin/activities/${activityId}/resources`,
            { method: 'POST', body: data }
        );

        if (result.ok) {
            return { ok: true };
        }

        if (result.status === 401) {
            return { ok: false, unauthorized: true, messages: [] };
        }

        let messages = Object.values(result.data.errors || {}).flat();

        if (result.status === 413) {
            messages = ['The selected files are larger than the server allows.'];
        }

        if (messages.length === 0) {
            messages = [
                result.data.message ||
                'The files could not be uploaded. Please try again.',
            ];
        }

        return { ok: false, messages };
    };

    const handleToggleForm = () => {
        if (showForm && editingId === null) {
            closeForm();
        } else {
            openCreateForm();
        }
    };


    // Load the full record from the server, then fill the form with it.
    const handleEdit = async (id) => {
        if (loadingEditId !== null) {
            return;
        }

        setNotice(null);
        setLoadingEditId(id);

        try {
            const result = await apiRequest(`/admin/activities/${id}`);

            if (result.status === 401) {
                handleUnauthorized();
                return;
            }

            if (!result.ok) {
                throw new Error('Unable to load this activity for editing.');
            }

            const activity = result.data.data;

            setForm({
                title: activity.title || '',
                categoryId: activity.category_id
                    ? String(activity.category_id)
                    : '',
                difficulty: activity.difficulty || 'Easy',
                description: activity.description || '',
                objective: activity.objective || '',
                instructions: arrayToLines(activity.instructions),
                materials: arrayToLines(activity.materials),
            });
            setEditingId(activity.id);
            setFieldErrors({});
            setFormError('');
            resetFiles();
            setExistingResources(
                Array.isArray(activity.resources) ? activity.resources : []
            );
            setShowForm(true);
        } catch (error) {
            setNotice({
                type: 'error',
                text:
                    error.message ||
                    'Unable to connect to the server. Please try again.',
            });
        } finally {
            setLoadingEditId(null);
        }
    };


    const handleSubmit = async (event) => {
        event.preventDefault();

        if (isSaving) {
            return;
        }

        const instructions = linesToArray(form.instructions);

        if (instructions.length === 0) {
            setFieldErrors({
                instructions: 'Add at least one instruction.',
            });
            setFormError('Please fix the highlighted fields.');
            return;
        }

        // Only these fields are sent. created_by and is_published are never
        // part of the form; the server controls them.
        const payload = {
            title: form.title.trim(),
            category_id: form.categoryId ? Number(form.categoryId) : null,
            difficulty: form.difficulty,
            description: form.description.trim() || null,
            objective: form.objective.trim() || null,
            instructions,
            materials: linesToArray(form.materials),
        };

        const isEditing = editingId !== null;

        setIsSaving(true);
        setFieldErrors({});
        setFormError('');
        setNotice(null);

        try {
            const result = await apiRequest(
                isEditing
                    ? `/admin/activities/${editingId}`
                    : '/admin/activities',
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

            if (!result.ok) {
                throw new Error(
                    result.data.message ||
                    'Unable to save the activity. Please try again.'
                );
            }

            // The activity itself is saved. Files, if any, are uploaded next.
            const savedId = isEditing ? editingId : result.data.data.id;
            const fileCount = pendingFiles.length;

            if (fileCount > 0) {
                setIsUploading(true);

                const upload = await uploadFiles(savedId);

                if (upload.unauthorized) {
                    handleUnauthorized();
                    return;
                }

                if (!upload.ok) {
                    // Stay in the form (now editing the saved activity) so
                    // the files can be fixed and sent again without creating
                    // a duplicate activity. Typed values are kept.
                    setEditingId(savedId);
                    setFileErrors(upload.messages);
                    setFormError(
                        'The activity was saved, but the files were not uploaded.'
                    );
                    reload(false);
                    return;
                }
            }

            const filesText =
                fileCount > 0
                    ? ` ${fileCount} ${fileCount === 1 ? 'file' : 'files'} uploaded.`
                    : '';

            setNotice({
                type: 'success',
                text: isEditing
                    ? `Activity updated.${filesText}`
                    : `Activity created as a draft. Publish it to make it visible to parents.${filesText}`,
            });
            closeForm();
            reload(false);
        } catch (error) {
            setFormError(
                error.message ||
                'Unable to connect to the server. Please try again.'
            );
        } finally {
            setIsUploading(false);
            setIsSaving(false);
        }
    };


    const handleTogglePublish = async (activity) => {
        if (busyId !== null) {
            return;
        }

        const action = activity.is_published ? 'unpublish' : 'publish';

        setNotice(null);
        setBusyId(activity.id);

        try {
            const result = await apiRequest(
                `/admin/activities/${activity.id}/${action}`,
                { method: 'POST' }
            );

            if (result.status === 401) {
                handleUnauthorized();
                return;
            }

            if (!result.ok) {
                throw new Error(
                    result.data.message ||
                    `Unable to ${action} this activity.`
                );
            }

            setNotice({
                type: 'success',
                text: `"${activity.title}" ${
                    action === 'publish' ? 'published' : 'unpublished'
                }.`,
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
            setBusyId(null);
        }
    };


    return (
        <div className={ui.page}>

            {/* Main Content */}

            <main className={ui.content}>

                <div className={ui.header}>

                    <div>

                        <h1 className={ui.title}>
                            Manage Activities
                        </h1>

                        <p className={ui.subtitle}>
                            Create and manage activities available
                            on TheraPlay.
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
                            className={ui.addButton}
                            onClick={handleToggleForm}
                        >
                            + Add Activity
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


                {/* Add / Edit Activity Form */}

                {showForm && (

                    <section className={ui.formCard}>

                        <h2 className={ui.formTitle}>
                            {editingId === null
                                ? 'Add New Activity'
                                : 'Edit Activity'}
                        </h2>


                        <form onSubmit={handleSubmit}>

                            {formError && (
                                <p className={ui.messageError} role="alert">
                                    {formError}
                                </p>
                            )}

                            <div className={ui.formGroup}>

                                <label className={ui.label} htmlFor="activity-title">
                                    Activity Name
                                </label>

                                <input className={ui.input}
                                    id="activity-title"
                                    type="text"
                                    placeholder="Enter activity name"
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

                                <label className={ui.label} htmlFor="activity-category">
                                    Category
                                </label>

                                <select className={ui.input}
                                    id="activity-category"
                                    value={form.categoryId}
                                    onChange={(event) =>
                                        updateField(
                                            'categoryId',
                                            event.target.value
                                        )
                                    }
                                >

                                    <option value="">
                                        No category
                                    </option>

                                    {categories.map((category) => (
                                        <option
                                            key={category.id}
                                            value={category.id}
                                        >
                                            {category.name}
                                        </option>
                                    ))}

                                </select>

                                {fieldErrors.category_id && (
                                    <p className={ui.fieldError}>
                                        {fieldErrors.category_id}
                                    </p>
                                )}

                            </div>


                            <div className={ui.formGroup}>

                                <label className={ui.label} htmlFor="activity-difficulty">
                                    Difficulty
                                </label>

                                <select className={ui.input}
                                    id="activity-difficulty"
                                    value={form.difficulty}
                                    onChange={(event) =>
                                        updateField(
                                            'difficulty',
                                            event.target.value
                                        )
                                    }
                                >

                                    <option value="Easy">
                                        Easy
                                    </option>

                                    <option value="Medium">
                                        Medium
                                    </option>

                                    <option value="Hard">
                                        Hard
                                    </option>

                                </select>

                                {fieldErrors.difficulty && (
                                    <p className={ui.fieldError}>
                                        {fieldErrors.difficulty}
                                    </p>
                                )}

                            </div>


                            <div className={ui.formGroup}>

                                <label className={ui.label} htmlFor="activity-description">
                                    Description (optional)
                                </label>

                                <textarea className={ui.textarea}
                                    id="activity-description"
                                    rows={3}
                                    placeholder="Short summary shown on the activity card"
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


                            <div className={ui.formGroup}>

                                <label className={ui.label} htmlFor="activity-objective">
                                    Objective (optional)
                                </label>

                                <textarea className={ui.textarea}
                                    id="activity-objective"
                                    rows={2}
                                    placeholder="What this activity helps to improve"
                                    value={form.objective}
                                    maxLength={2000}
                                    onChange={(event) =>
                                        updateField(
                                            'objective',
                                            event.target.value
                                        )
                                    }
                                />

                                {fieldErrors.objective && (
                                    <p className={ui.fieldError}>
                                        {fieldErrors.objective}
                                    </p>
                                )}

                            </div>


                            <div className={ui.formGroup}>

                                <label className={ui.label} htmlFor="activity-instructions">
                                    Instructions (one step per line)
                                </label>

                                <textarea className={ui.textarea}
                                    id="activity-instructions"
                                    rows={5}
                                    placeholder={'Look at the cards carefully.\nMatch the cards with the same image.'}
                                    value={form.instructions}
                                    onChange={(event) =>
                                        updateField(
                                            'instructions',
                                            event.target.value
                                        )
                                    }
                                    required
                                />

                                {fieldErrors.instructions && (
                                    <p className={ui.fieldError}>
                                        {fieldErrors.instructions}
                                    </p>
                                )}

                            </div>


                            <div className={ui.formGroup}>

                                <label className={ui.label} htmlFor="activity-materials">
                                    Materials (one per line, optional)
                                </label>

                                <textarea className={ui.textarea}
                                    id="activity-materials"
                                    rows={3}
                                    placeholder={'Activity cards\nMatching board'}
                                    value={form.materials}
                                    onChange={(event) =>
                                        updateField(
                                            'materials',
                                            event.target.value
                                        )
                                    }
                                />

                                {fieldErrors.materials && (
                                    <p className={ui.fieldError}>
                                        {fieldErrors.materials}
                                    </p>
                                )}

                            </div>


                            <div className={ui.formGroup}>

                                <label className={ui.label} htmlFor="activity-files">
                                    Attached files (optional)
                                </label>

                                <p className={ui.fileHint}>
                                    PDF, DOCX, PPTX, PNG, JPG or TXT, up to
                                    10 MB each.
                                </p>

                                {existingResources.length > 0 && (
                                    <ul className={ui.fileList}>

                                        {existingResources.map((resource) => (

                                            <li className={ui.fileItem} key={resource.id}>

                                                <span className={ui.fileName}>
                                                    {resource.file_name}
                                                </span>

                                                {confirmingResourceId === resource.id ? (

                                                    <span className={ui.fileActions}>

                                                        <span className={ui.confirmText}>
                                                            Remove this file?
                                                        </span>

                                                        <button
                                                            type="button"
                                                            className={ui.fileRemove}
                                                            onClick={() =>
                                                                handleRemoveResource(resource)
                                                            }
                                                            disabled={removingResourceId !== null}
                                                        >
                                                            {removingResourceId === resource.id
                                                                ? 'Removing...'
                                                                : 'Yes, remove'}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className={ui.fileRemove}
                                                            onClick={() =>
                                                                setConfirmingResourceId(null)
                                                            }
                                                            disabled={removingResourceId !== null}
                                                        >
                                                            Cancel
                                                        </button>

                                                    </span>

                                                ) : (

                                                    <button
                                                        type="button"
                                                        className={ui.fileRemove}
                                                        onClick={() =>
                                                            setConfirmingResourceId(resource.id)
                                                        }
                                                        disabled={isSaving || removingResourceId !== null}
                                                    >
                                                        Remove
                                                    </button>

                                                )}

                                            </li>

                                        ))}

                                    </ul>
                                )}

                                <input className={ui.input}
                                    id="activity-files"
                                    key={fileInputKey}
                                    type="file"
                                    multiple
                                    accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg,.txt"
                                    onChange={handleFilesSelected}
                                    disabled={isSaving}
                                />

                                {pendingFiles.length > 0 && (
                                    <ul className={ui.fileList}>

                                        {pendingFiles.map((file, index) => (

                                            <li
                                                className={ui.fileItem}
                                                key={`${file.name}-${file.size}`}
                                            >

                                                <span className={ui.fileName}>
                                                    {file.name}
                                                    <span className={ui.fileSize}>
                                                        {' '}({formatSize(file.size)})
                                                    </span>
                                                </span>

                                                <button
                                                    type="button"
                                                    className={ui.fileRemove}
                                                    onClick={() =>
                                                        handleRemovePendingFile(index)
                                                    }
                                                    disabled={isSaving}
                                                >
                                                    Remove
                                                </button>

                                            </li>

                                        ))}

                                    </ul>
                                )}

                                {fileErrors.map((message) => (
                                    <p className={ui.fieldError} key={message}>
                                        {message}
                                    </p>
                                ))}

                            </div>


                            <div className={ui.formActions}>

                                <button
                                    type="submit"
                                    className={ui.saveButton}
                                    disabled={isSaving}
                                >
                                    {isUploading
                                        ? `Uploading ${pendingFiles.length} ${pendingFiles.length === 1 ? 'file' : 'files'}...`
                                        : isSaving
                                        ? 'Saving...'
                                        : editingId === null
                                            ? 'Add Activity'
                                            : 'Save Changes'}
                                </button>

                                <button
                                    type="button"
                                    className={ui.cancelButton}
                                    onClick={closeForm}
                                    disabled={isSaving}
                                >
                                    Cancel
                                </button>

                            </div>

                        </form>

                    </section>

                )}


                {/* Activities Table */}

                {isLoading ? (

                    <TableSkeleton
                        label="Loading activities..."
                        columns={['Activity', 'Category', 'Difficulty', 'Status', 'Actions']}
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
                                        Activity
                                    </th>

                                    <th className={ui.th}>
                                        Category
                                    </th>

                                    <th className={ui.th}>
                                        Difficulty
                                    </th>

                                    <th className={ui.th}>
                                        Status
                                    </th>

                                    <th className={ui.th}>
                                        Actions
                                    </th>

                                </tr>

                            </thead>


                            <tbody className={ui.tbody}>

                                {activities.length === 0 && (

                                    <tr className={ui.row}>

                                        <td className={ui.tdEmpty} colSpan={5}>
                                            No activities yet. Use
                                            &ldquo;+ Add Activity&rdquo; to
                                            create the first one.
                                        </td>

                                    </tr>

                                )}

                                {activities.map((activity) => (

                                    <tr className={ui.row} key={activity.id}>

                                        <td className={ui.td} data-label="Activity">
                                            {activity.title}
                                        </td>

                                        <td className={ui.td} data-label="Category">
                                            {activity.category || '—'}
                                        </td>

                                        <td className={ui.td} data-label="Difficulty">

                                            <span
                                                className={difficultyBadgeTw(activity.difficulty)}
                                            >
                                                {activity.difficulty}
                                            </span>

                                        </td>

                                        <td className={ui.td} data-label="Status">

                                            <span
                                                className={activity.is_published ? ui.badgePublished : ui.badgeDraft}
                                            >
                                                {activity.is_published
                                                    ? 'Published'
                                                    : 'Draft'}
                                            </span>

                                        </td>

                                        <td className={ui.td} data-label="Actions">

                                            <div className={ui.actions}>

                                                <button
                                                    type="button"
                                                    className={ui.editButton}
                                                    aria-label={`Edit ${activity.title}`}
                                                    onClick={() =>
                                                        handleEdit(activity.id)
                                                    }
                                                    disabled={
                                                        loadingEditId !== null
                                                    }
                                                >
                                                    {loadingEditId === activity.id
                                                        ? 'Loading...'
                                                        : 'Edit'}
                                                </button>

                                                <button
                                                    type="button"
                                                    className={activity.is_published ? ui.unpublishButton : ui.publishButton}
                                                    aria-label={`${
                                                        activity.is_published
                                                            ? 'Unpublish'
                                                            : 'Publish'
                                                    } ${activity.title}`}
                                                    onClick={() =>
                                                        handleTogglePublish(
                                                            activity
                                                        )
                                                    }
                                                    disabled={busyId !== null}
                                                >
                                                    {busyId === activity.id
                                                        ? 'Working...'
                                                        : activity.is_published
                                                            ? 'Unpublish'
                                                            : 'Publish'}
                                                </button>

                                            </div>

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

export default ManageActivities;
