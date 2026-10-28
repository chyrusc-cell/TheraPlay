import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './authContext.js';
import {
    apiRequest,
    clearSession,
    mapValidationErrors,
} from './api.js';
import { TableSkeleton } from './Skeleton.jsx';
import { holdSkeleton } from './minLoading.js';
import * as ui from './adminClasses.js';

const emptyForm = {
    name: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    role: 'parent',
};

const formatDate = (value) =>
    value
        ? new Date(value).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
          })
        : '';

function ManageAccounts() {

    const navigate = useNavigate();

    // The signed-in admin (verified by the server), used only to label "you".
    const { user: currentUser } = useAuth();

    const [accounts, setAccounts] = useState([]);
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

    // { id, type: 'delete' | 'role' } while a row asks "are you sure?"
    const [confirming, setConfirming] = useState(null);
    const [busyId, setBusyId] = useState(null);


    // Expired or invalid token: clear it and go to the login page.
    const handleUnauthorized = useCallback(() => {
        clearSession();

        navigate('/login', {
            replace: true,
            state: { message: 'Please log in to continue.' },
        });
    }, [navigate]);


    useEffect(() => {
        const controller = new AbortController();
        const startedAt = performance.now();

        const loadAccounts = async () => {
            try {
                const result = await apiRequest('/admin/users', {
                    signal: controller.signal,
                });

                if (result.status === 401) {
                    handleUnauthorized();
                    return;
                }

                if (result.status === 403) {
                    throw new Error(
                        'You do not have permission to manage accounts.'
                    );
                }

                if (!result.ok) {
                    throw new Error('Unable to load accounts.');
                }

                setAccounts(
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

        loadAccounts();

        return () => controller.abort();
    }, [reloadKey, handleUnauthorized]);


    // showSpinner = false refreshes quietly after a change.
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
        setConfirming(null);
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

    const handleEdit = (account) => {
        setNotice(null);
        setConfirming(null);
        setForm({
            ...emptyForm,
            name: account.name || '',
            email: account.email || '',
            role: account.role || 'parent',
        });
        setEditingId(account.id);
        setFieldErrors({});
        setFormError('');
        setShowForm(true);
    };


    // Shared by the form, the quick role button and delete.
    const handleResult = (result, successText) => {
        if (result.status === 401) {
            handleUnauthorized();
            return false;
        }

        if (!result.ok) {
            // 409 carries a readable reason (last admin, own account, ...).
            setNotice({
                type: 'error',
                text:
                    result.data.message ||
                    'Something went wrong. Please try again.',
            });
            return false;
        }

        setNotice({ type: 'success', text: successText });
        return true;
    };


    const handleSubmit = async (event) => {
        event.preventDefault();

        if (isSaving) {
            return;
        }

        const isEditing = editingId !== null;

        const payload = isEditing
            ? {
                  name: form.name.trim(),
                  email: form.email.trim(),
                  role: form.role,
              }
            : {
                  name: form.name.trim(),
                  email: form.email.trim(),
                  password: form.password,
                  password_confirmation: form.passwordConfirmation,
                  role: form.role,
              };

        setIsSaving(true);
        setFieldErrors({});
        setFormError('');
        setNotice(null);

        try {
            const result = await apiRequest(
                isEditing ? `/admin/users/${editingId}` : '/admin/users',
                { method: isEditing ? 'PATCH' : 'POST', body: payload }
            );

            if (result.status === 422) {
                setFieldErrors(mapValidationErrors(result.data.errors));
                setFormError('Please fix the highlighted fields.');
                return;
            }

            if (result.status === 409) {
                // e.g. demoting the last administrator: keep the form open.
                setFormError(result.data.message);
                return;
            }

            if (handleResult(result, isEditing ? 'Account updated.' : 'Account created.')) {
                closeForm();
                reload(false);
            } else if (result.status === 404) {
                closeForm();
                reload(false);
            }
        } catch (error) {
            // Typed values stay in the form so they can be corrected.
            setFormError(
                error.message ||
                'Unable to connect to the server. Please try again.'
            );
        } finally {
            setIsSaving(false);
        }
    };


    const runAction = async (account, request, successText) => {
        if (busyId !== null) {
            return;
        }

        setNotice(null);
        setBusyId(account.id);

        try {
            const result = await request();

            if (handleResult(result, successText)) {
                if (editingId === account.id) {
                    closeForm();
                }

                reload(false);
            } else if (result.status === 404) {
                reload(false);
            }
        } catch (error) {
            setNotice({
                type: 'error',
                text:
                    error.message ||
                    'Unable to connect to the server. Please try again.',
            });
        } finally {
            setConfirming(null);
            setBusyId(null);
        }
    };

    const handleDelete = (account) =>
        runAction(
            account,
            () => apiRequest(`/admin/users/${account.id}`, { method: 'DELETE' }),
            `"${account.name}" was deleted.`
        );

    const handleToggleRole = (account) => {
        const newRole = account.role === 'admin' ? 'parent' : 'admin';

        return runAction(
            account,
            () =>
                apiRequest(`/admin/users/${account.id}`, {
                    method: 'PATCH',
                    body: { role: newRole },
                }),
            `"${account.name}" is now ${newRole === 'admin' ? 'an admin' : 'a parent'}.`
        );
    };


    const renderActions = (account) => {
        const isSelf = currentUser?.id === account.id;
        const isBusy = busyId === account.id;
        const targetRole = account.role === 'admin' ? 'parent' : 'admin';

        if (confirming?.id === account.id) {
            const isDelete = confirming.type === 'delete';

            return (
                <div className={ui.actions}>

                    <span className={ui.confirmText}>
                        {isDelete
                            ? 'Delete this account?'
                            : `Make this account ${targetRole === 'admin' ? 'an admin' : 'a parent'}? They will be signed out.`}
                    </span>

                    <button
                        type="button"
                        className={ui.deleteButton}
                        onClick={() =>
                            isDelete
                                ? handleDelete(account)
                                : handleToggleRole(account)
                        }
                        disabled={busyId !== null}
                    >
                        {isBusy ? 'Working...' : 'Yes, continue'}
                    </button>

                    <button
                        type="button"
                        className={ui.editButton}
                        onClick={() => setConfirming(null)}
                        disabled={busyId !== null}
                    >
                        Cancel
                    </button>

                </div>
            );
        }

        return (
            <div className={ui.actions}>

                <button
                    type="button"
                    className={ui.editButton}
                    aria-label={`Edit ${account.name}`}
                    onClick={() => handleEdit(account)}
                    disabled={busyId !== null}
                >
                    Edit
                </button>

                <button
                    type="button"
                    className={ui.neutralRowButton}
                    aria-label={`${account.role === 'admin' ? 'Make parent' : 'Make admin'}: ${account.name}`}
                    onClick={() =>
                        setConfirming({ id: account.id, type: 'role' })
                    }
                    disabled={busyId !== null}
                >
                    {account.role === 'admin' ? 'Make Parent' : 'Make Admin'}
                </button>

                <button
                    type="button"
                    className={ui.deleteButton}
                    aria-label={`Delete ${account.name}`}
                    onClick={() =>
                        setConfirming({ id: account.id, type: 'delete' })
                    }
                    disabled={busyId !== null || isSelf}
                    title={isSelf ? 'You cannot delete your own account' : undefined}
                >
                    Delete
                </button>

            </div>
        );
    };


    const isEditing = editingId !== null;

    return (
        <div className={ui.page}>

            <main className={ui.content}>

                <div className={ui.header}>

                    <div>

                        <h1 className={ui.title}>
                            Manage Accounts
                        </h1>

                        <p className={ui.subtitle}>
                            Create accounts, change roles and remove
                            accounts.
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
                            + Create Account
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


                {showForm && (

                    <section className={ui.formCard}>

                        <h2 className={ui.formTitle}>
                            {isEditing ? 'Edit Account' : 'Create New Account'}
                        </h2>


                        <form onSubmit={handleSubmit}>

                            {formError && (
                                <p className={ui.messageError} role="alert">
                                    {formError}
                                </p>
                            )}

                            <div className={ui.formGroup}>

                                <label className={ui.label} htmlFor="account-name">
                                    Name
                                </label>

                                <input className={ui.input}
                                    id="account-name"
                                    type="text"
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

                                <label className={ui.label} htmlFor="account-email">
                                    Email
                                </label>

                                <input className={ui.input}
                                    id="account-email"
                                    type="email"
                                    value={form.email}
                                    maxLength={255}
                                    onChange={(event) =>
                                        updateField('email', event.target.value)
                                    }
                                    required
                                />

                                {fieldErrors.email && (
                                    <p className={ui.fieldError}>
                                        {fieldErrors.email}
                                    </p>
                                )}

                            </div>


                            {!isEditing && (
                                <>

                                    <div className={ui.formGroup}>

                                        <label className={ui.label} htmlFor="account-password">
                                            Password (at least 8 characters)
                                        </label>

                                        <input className={ui.input}
                                            id="account-password"
                                            type="password"
                                            autoComplete="new-password"
                                            value={form.password}
                                            onChange={(event) =>
                                                updateField(
                                                    'password',
                                                    event.target.value
                                                )
                                            }
                                            required
                                        />

                                        {fieldErrors.password && (
                                            <p className={ui.fieldError}>
                                                {fieldErrors.password}
                                            </p>
                                        )}

                                    </div>


                                    <div className={ui.formGroup}>

                                        <label className={ui.label} htmlFor="account-password-confirm">
                                            Confirm Password
                                        </label>

                                        <input className={ui.input}
                                            id="account-password-confirm"
                                            type="password"
                                            autoComplete="new-password"
                                            value={form.passwordConfirmation}
                                            onChange={(event) =>
                                                updateField(
                                                    'passwordConfirmation',
                                                    event.target.value
                                                )
                                            }
                                            required
                                        />

                                    </div>

                                </>
                            )}


                            <div className={ui.formGroup}>

                                <label className={ui.label} htmlFor="account-role">
                                    Role
                                </label>

                                <select className={ui.input}
                                    id="account-role"
                                    value={form.role}
                                    onChange={(event) =>
                                        updateField('role', event.target.value)
                                    }
                                >

                                    <option value="parent">
                                        Parent
                                    </option>

                                    <option value="admin">
                                        Admin
                                    </option>

                                </select>

                                {isEditing && (
                                    <p className={ui.cellSub}>
                                        Changing a role signs the person out
                                        of their devices.
                                    </p>
                                )}

                                {fieldErrors.role && (
                                    <p className={ui.fieldError}>
                                        {fieldErrors.role}
                                    </p>
                                )}

                            </div>


                            <div className={ui.formActions}>

                                <button
                                    type="submit"
                                    className={ui.saveButton}
                                    disabled={isSaving}
                                >
                                    {isSaving
                                        ? 'Saving...'
                                        : isEditing
                                            ? 'Save Changes'
                                            : 'Create Account'}
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


                {isLoading ? (

                    <TableSkeleton
                        label="Loading accounts..."
                        columns={['Name', 'Email', 'Role', 'Actions']}
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
                                        Email
                                    </th>

                                    <th className={ui.th}>
                                        Role
                                    </th>

                                    <th className={ui.th}>
                                        Actions
                                    </th>

                                </tr>

                            </thead>


                            <tbody className={ui.tbody}>

                                {accounts.length === 0 && (

                                    <tr className={ui.row}>

                                        <td className={ui.tdEmpty} colSpan={4}>
                                            No accounts found.
                                        </td>

                                    </tr>

                                )}

                                {accounts.map((account) => (

                                    <tr className={ui.row} key={account.id}>

                                        <td className={ui.td} data-label="Name">

                                            {account.name}

                                            {currentUser?.id === account.id && (
                                                <span className={ui.youTag}>
                                                    you
                                                </span>
                                            )}

                                            <div className={ui.cellSub}>
                                                Joined {formatDate(account.created_at)}
                                                {account.has_child_profile &&
                                                    ' • has a child profile'}
                                            </div>

                                        </td>

                                        <td className={ui.td} data-label="Email">
                                            {account.email}
                                        </td>

                                        <td className={ui.td} data-label="Role">

                                            <span
                                                className={account.role === 'admin' ? ui.badgeAdmin : ui.badgeParent}
                                            >
                                                {account.role === 'admin'
                                                    ? 'Admin'
                                                    : 'Parent'}
                                            </span>

                                        </td>

                                        <td className={ui.td} data-label="Actions">
                                            {renderActions(account)}
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

export default ManageAccounts;
