import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    API_URL,
    apiRequest,
    clearSession,
    getToken,
    mapValidationErrors,
} from './api.js';
import { TableSkeleton } from './Skeleton.jsx';
import { holdSkeleton } from './minLoading.js';
import { difficultyBadgeTw } from './uiHelpers.js';
import * as ui from './adminClasses.js';
import Modal from './Modal.jsx';
import ConditionsAdmin from './ConditionsAdmin.jsx';

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
    conditionIds: [],
    isForAllConditions: false,
};

// Picture rules (the server checks again, from the file's real content).
const PICTURE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PICTURE_MAX_BYTES = 5 * 1024 * 1024;

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

    // The predefined conditions (admin-managed). An activity is shown to a child
    // whose conditions match at least one of its conditions, or to everyone when
    // it is marked suitable for all conditions.
    const [conditions, setConditions] = useState([]);
    const [conditionsOpen, setConditionsOpen] = useState(false);

    // Activity picture: the saved one (shown through a temporary blob URL,
    // because the admin picture route needs the login token), a newly chosen
    // file waiting for Save, and a flag to remove the saved one.
    const pictureInputRef = useRef(null);
    const pictureRequestRef = useRef(0);
    const [hasSavedPicture, setHasSavedPicture] = useState(false);
    const [savedPictureSrc, setSavedPictureSrc] = useState(null);
    const [pictureFile, setPictureFile] = useState(null);
    const [picturePreview, setPicturePreview] = useState(null);
    const [removePicture, setRemovePicture] = useState(false);
    const [pictureError, setPictureError] = useState('');
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
        const startedAt = performance.now();

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
                await holdSkeleton(startedAt, controller.signal);

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


    useEffect(() => {
        const controller = new AbortController();

        const loadConditions = async () => {
            try {
                const result = await apiRequest('/admin/conditions', { signal: controller.signal });

                if (result.ok && Array.isArray(result.data.data)) {
                    setConditions(result.data.data);
                }
            } catch {
                // The field just shows no conditions; the page keeps working.
            }
        };

        loadConditions();

        return () => controller.abort();
    }, []);

    // Merge one saved condition (added or changed in the modal) into the list.
    const mergeCondition = (saved) => {
        setConditions((current) =>
            current.some((item) => item.id === saved.id)
                ? current.map((item) => (item.id === saved.id ? saved : item))
                : [...current, saved].sort((a, b) => a.name.localeCompare(b.name))
        );
    };

    const toggleFormCondition = (id) => {
        setForm((current) => ({
            ...current,
            conditionIds: current.conditionIds.includes(id)
                ? current.conditionIds.filter((value) => value !== id)
                : [...current.conditionIds, id],
        }));
    };

    const updateField = (name, value) => {
        setForm((current) => ({ ...current, [name]: value }));
    };

    // Free temporary picture URLs when they are replaced or the form closes.
    useEffect(() => {
        if (!picturePreview) {
            return undefined;
        }

        return () => URL.revokeObjectURL(picturePreview);
    }, [picturePreview]);

    useEffect(() => {
        if (!savedPictureSrc) {
            return undefined;
        }

        return () => URL.revokeObjectURL(savedPictureSrc);
    }, [savedPictureSrc]);

    const resetPicture = () => {
        // Ignore a saved-picture download that is still running.
        pictureRequestRef.current += 1;
        setHasSavedPicture(false);
        setSavedPictureSrc(null);
        setPictureFile(null);
        setPicturePreview(null);
        setRemovePicture(false);
        setPictureError('');
    };

    // Shows the activity's saved picture (the picture of a draft is only
    // available to the admin, with the token).
    const loadSavedPicture = async (activityId) => {
        const requestId = pictureRequestRef.current;
        const token = getToken();

        if (!token) {
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/admin/activities/${activityId}/image`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!response.ok) {
                return;
            }

            const blob = await response.blob();

            if (requestId === pictureRequestRef.current) {
                setSavedPictureSrc(URL.createObjectURL(blob));
            }
        } catch {
            // The prompt stays; the picture can still be replaced or removed.
        }
    };

    const handlePictureSelected = (event) => {
        const file = event.target.files?.[0];

        // Let the same file be chosen again later.
        event.target.value = '';

        if (!file) {
            return;
        }

        if (!PICTURE_TYPES.includes(file.type)) {
            setPictureError('Choose a JPG, PNG or WebP image.');
            return;
        }

        if (file.size > PICTURE_MAX_BYTES) {
            setPictureError('The picture must be 5 MB or smaller.');
            return;
        }

        setPictureError('');
        setPictureFile(file);
        setPicturePreview(URL.createObjectURL(file));
        setRemovePicture(false);
    };

    const handleRemovePicture = () => {
        setPictureFile(null);
        setPicturePreview(null);
        setPictureError('');
        setRemovePicture(hasSavedPicture);
    };

    const resetFiles = () => {
        setPendingFiles([]);
        setExistingResources([]);
        setFileErrors([]);
        setConfirmingResourceId(null);
        setFileInputKey((key) => key + 1);
    };

    const closeForm = () => {
        resetPicture();
        setShowForm(false);
        setEditingId(null);
        setForm(emptyForm);
        setFieldErrors({});
        setFormError('');
        resetFiles();
    };

    const openCreateForm = () => {
        resetPicture();
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
                conditionIds: Array.isArray(activity.condition_ids) ? activity.condition_ids : [],
                isForAllConditions: Boolean(activity.is_for_all_conditions),
            });
            setEditingId(activity.id);
            setFieldErrors({});
            setFormError('');
            resetFiles();
            resetPicture();

            if (activity.image_url) {
                setHasSavedPicture(true);
                loadSavedPicture(activity.id);
            }
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
            condition_ids: form.conditionIds,
            is_for_all_conditions: form.isForAllConditions,
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

            // The picture is sent first (a file, so its own multipart
            // request). If it fails the files are not sent yet either, and
            // everything can be retried from the saved activity.
            if (pictureFile || (removePicture && isEditing)) {
                const pictureResult = pictureFile
                    ? await apiRequest(
                          `/admin/activities/${savedId}/image`,
                          {
                              method: 'POST',
                              body: (() => {
                                  const data = new FormData();

                                  data.append('image', pictureFile);

                                  return data;
                              })(),
                          }
                      )
                    : await apiRequest(
                          `/admin/activities/${savedId}/image`,
                          { method: 'DELETE' }
                      );

                if (pictureResult.status === 401) {
                    handleUnauthorized();
                    return;
                }

                if (!pictureResult.ok) {
                    setEditingId(savedId);
                    setPictureError(
                        pictureResult.data.errors?.image?.[0] ||
                        (pictureResult.status === 413
                            ? 'The picture is larger than the server allows.'
                            : pictureResult.data.message ||
                              'The picture could not be saved. Please try again.')
                    );
                    setFormError(
                        'The activity was saved, but the picture was not updated.'
                    );
                    reload(false);
                    return;
                }
            }

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
                            className={ui.cancelButton}
                            onClick={() => setConditionsOpen(true)}
                        >
                            Manage Conditions
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

                <Modal
                    open={showForm}
                    onClose={closeForm}
                    busy={isSaving}
                    size="xl"
                    title={editingId === null
                                ? 'Add New Activity'
                                : 'Edit Activity'}
                >

                    <form onSubmit={handleSubmit}>

                            {formError && (
                                <p className={ui.messageError} role="alert">
                                    {formError}
                                </p>
                            )}

                            <div className={ui.activityFormGrid}>

                                {/* Left column */}

                                <div>

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

                                    <label className={ui.label} htmlFor="activity-description">
                                        Description (optional)
                                    </label>

                                    <textarea className={`${ui.activityTextarea} h-20`}
                                        id="activity-description"
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

                                    <textarea className={`${ui.activityTextarea} h-16`}
                                        id="activity-objective"
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

                                    <textarea className={`${ui.activityTextarea} h-32`}
                                        id="activity-instructions"
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

                                    <textarea className={`${ui.activityTextarea} h-20`}
                                        id="activity-materials"
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

                                </div>


                                {/* Right column */}

                                <div>

                                    <div className={ui.formGroup}>

                                        <span className={ui.label} id="activity-picture-label">
                                            Activity Picture
                                        </span>

                                        <button
                                            type="button"
                                            className={ui.activityPictureButton}
                                            onClick={() => pictureInputRef.current?.click()}
                                            disabled={isSaving}
                                            aria-labelledby="activity-picture-label"
                                        >
                                            {picturePreview || (!removePicture && savedPictureSrc) ? (
                                                <img
                                                    src={picturePreview || (!removePicture && savedPictureSrc)}
                                                    alt=""
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <span className="px-4">
                                                    {hasSavedPicture && !removePicture
                                                        ? 'Current picture (preview loading or unavailable)'
                                                        : 'Choose a picture'}
                                                </span>
                                            )}
                                        </button>

                                        <input
                                            ref={pictureInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            className="sr-only"
                                            tabIndex={-1}
                                            aria-hidden="true"
                                            onChange={handlePictureSelected}
                                            disabled={isSaving}
                                        />

                                        <div className="mt-2 flex flex-wrap gap-2">

                                            <button
                                                type="button"
                                                className={ui.fileRemove}
                                                onClick={() => pictureInputRef.current?.click()}
                                                disabled={isSaving}
                                            >
                                                {picturePreview || (hasSavedPicture && !removePicture)
                                                    ? 'Replace picture'
                                                    : 'Choose picture'}
                                            </button>

                                            {(pictureFile || (hasSavedPicture && !removePicture)) && (
                                                <button
                                                    type="button"
                                                    className={ui.fileRemove}
                                                    onClick={handleRemovePicture}
                                                    disabled={isSaving}
                                                >
                                                    Remove picture
                                                </button>
                                            )}

                                        </div>

                                        <p className={ui.fileHint}>
                                            JPG, PNG or WebP, up to 5 MB.
                                        </p>

                                        {pictureError && (
                                            <p className={ui.fieldError} role="alert">
                                                {pictureError}
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


                                    <div className={ui.activityPairRow}>

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

                                    </div>


                                    <div className={ui.formGroup}>

                                        <span className={ui.label} id="activity-conditions-label">
                                            Relevant Conditions
                                        </span>

                                        <p className={ui.fileHint}>
                                            A child sees this activity when one of their conditions is selected
                                            here (or when it is marked suitable for all).
                                        </p>

                                        <label className="mb-2 flex cursor-pointer items-center gap-2 text-[14px] text-ink">
                                            <input
                                                type="checkbox"
                                                className="accent-accent"
                                                checked={form.isForAllConditions}
                                                onChange={(event) =>
                                                    updateField('isForAllConditions', event.target.checked)
                                                }
                                            />
                                            Suitable for all conditions
                                        </label>

                                        {conditions.length === 0 ? (
                                            <p className={ui.fileHint}>
                                                No conditions yet. Use "Manage Conditions" at the top of the page
                                                to add some.
                                            </p>
                                        ) : (
                                            <ul
                                                className="max-h-40 list-none overflow-y-auto rounded-md border border-edge-strong p-2"
                                                aria-labelledby="activity-conditions-label"
                                            >
                                                {conditions
                                                    .filter(
                                                        (condition) =>
                                                            condition.is_active ||
                                                            form.conditionIds.includes(condition.id)
                                                    )
                                                    .map((condition) => (
                                                        <li key={condition.id}>
                                                            <label className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-[14px] text-ink hover:bg-hover">
                                                                <input
                                                                    type="checkbox"
                                                                    className="mt-0.5 shrink-0 accent-accent"
                                                                    checked={form.conditionIds.includes(condition.id)}
                                                                    onChange={() => toggleFormCondition(condition.id)}
                                                                />
                                                                <span className="[overflow-wrap:anywhere]">
                                                                    {condition.name}
                                                                    {!condition.is_active && ' (switched off)'}
                                                                </span>
                                                            </label>
                                                        </li>
                                                    ))}
                                            </ul>
                                        )}

                                        {(fieldErrors.condition_ids || fieldErrors.is_for_all_conditions) && (
                                            <p className={ui.fieldError}>
                                                {fieldErrors.condition_ids || fieldErrors.is_for_all_conditions}
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
                                    {isUploading
                                        ? `Uploading ${pendingFiles.length} ${pendingFiles.length === 1 ? 'file' : 'files'}...`
                                        : isSaving
                                        ? 'Saving...'
                                        : editingId === null
                                            ? 'Add Activity'
                                            : 'Save Changes'}
                                </button>

                            </div>

                        </form>

                </Modal>


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


                <Modal
                    open={conditionsOpen}
                    onClose={() => setConditionsOpen(false)}
                    size="md"
                    title="Manage Conditions"
                >
                    <ConditionsAdmin conditions={conditions} onSaved={mergeCondition} />
                </Modal>

            </main>

        </div>
    );
}

export default ManageActivities;
