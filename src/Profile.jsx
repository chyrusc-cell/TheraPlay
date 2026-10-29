import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from './api.js';
import { useAuth } from './authContext.js';
import { ProfileAvatar } from './ProfileAvatar.jsx';
import { CardsSkeleton } from './Skeleton.jsx';
import { holdSkeleton } from './minLoading.js';
import { pageMainNarrow, pageHeader, pageTitle } from './uiClasses.js';

const API_URL = 'http://127.0.0.1:8000/api';

// The token is saved by Login.jsx in either localStorage or sessionStorage.
const getToken = () =>
    localStorage.getItem('theraplay_token') ||
    sessionStorage.getItem('theraplay_token');

// The database stores one "name", while this page shows first and last name.
const splitName = (fullName = '') => {
    const trimmed = fullName.trim();
    const lastSpace = trimmed.lastIndexOf(' ');

    if (lastSpace === -1) {
        return { firstName: trimmed, lastName: '' };
    }

    return {
        firstName: trimmed.slice(0, lastSpace),
        lastName: trimmed.slice(lastSpace + 1),
    };
};

const toFormValues = (user) => ({
    ...splitName(user.name),
    email: user.email || '',
    phone: user.contact_number || '',
});

// Card look as currently rendered (the old global .card rule was merged from the
// Dashboard, Progress and Profile stylesheets).
const cardClass =
    'mb-6 overflow-hidden rounded-xl border border-[#eaeaea] bg-white p-[30px] shadow-[0_2px_10px_rgba(0,0,0,0.02)]';
const cardTitleClass = 'mb-[30px] text-[18px] font-bold text-ink';

// Form fields: a floating label on the top border of each input.
const fieldClass = 'relative mb-[30px] flex flex-col gap-2';
const fieldLabelClass =
    'pointer-events-none absolute top-0 left-2.5 -translate-y-1/2 bg-white px-1 text-[12px] font-medium text-[#888]';
const fieldInputClass =
    'w-full rounded-lg border border-[#ddd] px-3.5 py-3 [font-family:inherit] text-[15px] font-medium text-ink transition-[border-color] focus:border-[#333]';

const pillButtonClass =
    'cursor-pointer rounded-[20px] border border-[#333] bg-white px-6 py-2 [font-family:inherit] text-[14px] font-bold text-[#333] transition-colors enabled:hover:bg-[#333] enabled:hover:text-white';

const smallPillClass =
    'cursor-pointer rounded-[20px] border border-[#333] bg-white px-4 py-1.5 [font-family:inherit] text-[13px] font-bold text-[#333] transition-colors enabled:hover:bg-[#333] enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-60';

// Picture rules (the server checks again, from the file's real content).
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

// Colors for the password-reset notice, by type.
const noticeColors = {
    success: 'text-[#188038]',
    warning: 'text-[#b26a00]',
    error: 'text-[#d93025]',
};

function Profile() {
    const navigate = useNavigate();

    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    // Password reset request (separate from saving the profile).
    const [isSendingReset, setIsSendingReset] = useState(false);
    const [resetNotice, setResetNotice] = useState(null);

    // Profile picture (saved on its own, separately from the personal details).
    const { user: authUser, updateUser } = useAuth();
    const photoInputRef = useRef(null);
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [photoBusy, setPhotoBusy] = useState(false);
    const [photoNotice, setPhotoNotice] = useState(null);

    // Last profile that came from the server (used by Cancel).
    const [savedUser, setSavedUser] = useState(null);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    const fillForm = (user) => {
        const values = toFormValues(user);
        setFirstName(values.firstName);
        setLastName(values.lastName);
        setEmail(values.email);
        setPhone(values.phone);
    };

    const showMessage = (text, error) => {
        setMessage(text);
        setIsError(error);
    };

    // Token missing or rejected: clear it and send the user to the login page.
    const redirectToLogin = () => {
        ['theraplay_token', 'theraplay_user'].forEach((key) => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        navigate('/login', {
            replace: true,
            state: { message: 'Please log in to view your profile.' },
        });
    };

    useEffect(() => {
        const token = getToken();

        if (!token) {
            redirectToLogin();
            return;
        }

        const controller = new AbortController();

        const startedAt = performance.now();

        const loadProfile = async () => {
            try {
                const response = await fetch(`${API_URL}/user`, {
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    signal: controller.signal,
                });

                if (response.status === 401) {
                    redirectToLogin();
                    return;
                }

                if (!response.ok) {
                    throw new Error('Unable to load your profile.');
                }

                const user = await response.json();
                setSavedUser(user);
                fillForm(user);
            } catch (error) {
                if (error.name === 'AbortError') {
                    return;
                }

                showMessage(
                    error.message ||
                    'Unable to connect to the server. Please try again.',
                    true
                );
            } finally {
                await holdSkeleton(startedAt, controller.signal);

                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        loadProfile();

        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSave = async (event) => {
        event.preventDefault();

        if (isSaving) {
            return;
        }

        const token = getToken();

        if (!token) {
            redirectToLogin();
            return;
        }

        const name = `${firstName.trim()} ${lastName.trim()}`.trim();

        if (!name) {
            showMessage('Please enter your name.', true);
            return;
        }

        setIsSaving(true);
        showMessage('', false);

        try {
            const response = await fetch(`${API_URL}/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name,
                    email: email.trim(),
                    contact_number: phone.trim() || null,
                }),
            });

            if (response.status === 401) {
                redirectToLogin();
                return;
            }

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                // Laravel validation errors come back as { errors: { field: [..] } }.
                const firstError = data.errors
                    ? Object.values(data.errors)[0]?.[0]
                    : null;

                throw new Error(
                    firstError ||
                    data.message ||
                    'Unable to save your profile. Please try again.'
                );
            }

            setSavedUser(data.user);
            fillForm(data.user);

            // Keep the user copy saved at login in sync.
            [localStorage, sessionStorage].forEach((storage) => {
                if (storage.getItem('theraplay_user')) {
                    storage.setItem('theraplay_user', JSON.stringify(data.user));
                }
            });

            showMessage(data.message || 'Profile updated successfully.', false);
            setIsEditing(false);
        } catch (error) {
            showMessage(
                error.message ||
                'Unable to connect to the server. Please try again.',
                true
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (savedUser) {
            fillForm(savedUser);
        }

        showMessage('', false);
        setIsEditing(false);
    };

    // Asks the server to email a reset link to this account's own address.
    // No email or id is sent: the server uses the logged-in user.
    const handleRequestReset = async () => {
        if (isSendingReset) {
            return;
        }

        setIsSendingReset(true);
        setResetNotice(null);

        try {
            const result = await apiRequest('/profile/password-reset', {
                method: 'POST',
            });

            if (result.status === 401) {
                redirectToLogin();
                return;
            }

            // Success is shown only when the server says the email was really
            // delivered. Otherwise its explanation is shown as a warning.
            if (result.ok) {
                setResetNotice({
                    type: result.data.delivered ? 'success' : 'warning',
                    text: result.data.message,
                });
                return;
            }

            setResetNotice({
                type: 'error',
                text:
                    result.data.message ||
                    'Unable to request a password reset. Please try again.',
            });
        } catch {
            setResetNotice({
                type: 'error',
                text: 'Unable to connect to the server. Please try again.',
            });
        } finally {
            setIsSendingReset(false);
        }
    };

    // Free the temporary preview when it is replaced or discarded.
    useEffect(() => {
        if (!photoPreview) {
            return undefined;
        }

        return () => URL.revokeObjectURL(photoPreview);
    }, [photoPreview]);

    const handlePhotoSelected = (event) => {
        const file = event.target.files?.[0];

        // Let the same file be chosen again later.
        event.target.value = '';

        if (!file) {
            return;
        }

        if (!PHOTO_TYPES.includes(file.type)) {
            setPhotoNotice({ type: 'error', text: 'Choose a JPG, PNG or WebP image.' });
            return;
        }

        if (file.size > PHOTO_MAX_BYTES) {
            setPhotoNotice({ type: 'error', text: 'The picture must be 2 MB or smaller.' });
            return;
        }

        setPhotoNotice(null);
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const discardPhoto = () => {
        setPhotoFile(null);
        setPhotoPreview(null);
        setPhotoNotice(null);
    };

    const handleSavePhoto = async () => {
        if (!photoFile || photoBusy) {
            return;
        }

        setPhotoBusy(true);
        setPhotoNotice(null);

        try {
            const body = new FormData();

            body.append('photo', photoFile);

            const result = await apiRequest('/profile/photo', { method: 'POST', body });

            if (result.status === 401) {
                redirectToLogin();
                return;
            }

            if (!result.ok) {
                setPhotoNotice({
                    type: 'error',
                    text:
                        result.data.errors?.photo?.[0] ||
                        result.data.message ||
                        `The picture could not be saved (server error ${result.status}).`,
                });
                return;
            }

            updateUser({ photo_url: result.data.data.photo_url });
            setPhotoFile(null);
            setPhotoPreview(null);
            setPhotoNotice({ type: 'success', text: 'Profile picture saved.' });
        } catch {
            setPhotoNotice({
                type: 'error',
                text: 'Unable to connect to the server. Please try again.',
            });
        } finally {
            setPhotoBusy(false);
        }
    };

    const handleRemovePhoto = async () => {
        if (photoBusy) {
            return;
        }

        setPhotoBusy(true);
        setPhotoNotice(null);

        try {
            const result = await apiRequest('/profile/photo', { method: 'DELETE' });

            if (result.status === 401) {
                redirectToLogin();
                return;
            }

            if (!result.ok) {
                throw new Error('The picture could not be removed.');
            }

            updateUser({ photo_url: null });
            setPhotoNotice({ type: 'success', text: 'Profile picture removed.' });
        } catch (error) {
            setPhotoNotice({
                type: 'error',
                text: error.message || 'Unable to connect to the server. Please try again.',
            });
        } finally {
            setPhotoBusy(false);
        }
    };

    const roleLabel = savedUser?.role
        ? savedUser.role.charAt(0).toUpperCase() + savedUser.role.slice(1)
        : '';

    if (isLoading) {
        return (
            <div className="flex min-h-page flex-col">
                <main className={pageMainNarrow}>
                    <CardsSkeleton label="Loading your profile..." cards={2} />
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-page flex-col">
            <main className={pageMainNarrow}>
                <div className={`${pageHeader} flex items-center justify-between`}>
                    <h1 className={pageTitle}>My Profile</h1>

                    {!isEditing && savedUser && (
                        <button
                            className={pillButtonClass}
                            type="button"
                            onClick={() => setIsEditing(true)}
                        >
                            Edit
                        </button>
                    )}
                </div>

                {/* Profile Avatar Card */}
                <div className={`${cardClass} flex items-center gap-6 phone:flex-col phone:items-start`}>
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-[#ddd] bg-[#e9ecef] text-[#888]">
                        <ProfileAvatar
                            photoUrl={authUser?.photo_url}
                            previewSrc={photoPreview}
                            iconSize={32}
                        />
                    </div>

                    <div className="min-w-0 flex-1">
                        <h2 className="mb-1 text-[24px] font-bold text-ink">{firstName} {lastName}</h2>
                        <p className="text-[14px] font-medium text-muted">{roleLabel}</p>

                        <div className="mt-3 flex flex-wrap gap-2">
                            {photoFile ? (
                                <>
                                    <button
                                        type="button"
                                        className={smallPillClass}
                                        onClick={handleSavePhoto}
                                        disabled={photoBusy}
                                    >
                                        {photoBusy ? 'Saving...' : 'Save picture'}
                                    </button>
                                    <button
                                        type="button"
                                        className={smallPillClass}
                                        onClick={discardPhoto}
                                        disabled={photoBusy}
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        className={smallPillClass}
                                        onClick={() => photoInputRef.current?.click()}
                                        disabled={photoBusy}
                                    >
                                        {authUser?.photo_url ? 'Replace picture' : 'Add picture'}
                                    </button>
                                    {authUser?.photo_url && (
                                        <button
                                            type="button"
                                            className={smallPillClass}
                                            onClick={handleRemovePhoto}
                                            disabled={photoBusy}
                                        >
                                            {photoBusy ? 'Removing...' : 'Remove picture'}
                                        </button>
                                    )}
                                </>
                            )}
                        </div>

                        <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="sr-only"
                            tabIndex={-1}
                            aria-hidden="true"
                            onChange={handlePhotoSelected}
                            disabled={photoBusy}
                        />

                        <p className="mt-2 text-[12px] text-[#888]">JPG, PNG or WebP, up to 2 MB.</p>

                        {photoNotice && (
                            <p
                                className={`mt-2 text-[13px] font-medium ${
                                    photoNotice.type === 'error' ? 'text-[#d93025]' : 'text-[#188038]'
                                }`}
                                role={photoNotice.type === 'error' ? 'alert' : 'status'}
                            >
                                {photoNotice.text}
                            </p>
                        )}
                    </div>
                </div>

                {message && (
                    <p
                        role="alert"
                        className={`mb-4 text-[14px] font-medium ${
                            isError ? 'text-[#d93025]' : 'text-[#188038]'
                        }`}
                    >
                        {message}
                    </p>
                )}

                {/* Personal Information Card */}
                <form onSubmit={handleSave}>
                    <div className={cardClass}>
                        <h3 className={cardTitleClass}>Personal Information</h3>

                        {!isEditing ? (
                            <div className="grid grid-cols-2 gap-[30px] phone:grid-cols-1 phone:gap-5">
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[12px] font-medium text-[#888]">First Name</span>
                                    <span className="text-[15px] font-bold text-ink">{firstName}</span>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[12px] font-medium text-[#888]">Last Name</span>
                                    <span className="text-[15px] font-bold text-ink">{lastName}</span>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[12px] font-medium text-[#888]">Email Address</span>
                                    <span className="text-[15px] font-bold text-ink">{email}</span>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[12px] font-medium text-[#888]">Phone Number</span>
                                    <span className="text-[15px] font-bold text-ink">{phone}</span>
                                </div>

                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-[30px] phone:grid-cols-1 phone:gap-5">
                                <div className={fieldClass}>
                                    <label className={fieldLabelClass} htmlFor="firstName">First Name</label>
                                    <input className={fieldInputClass}
                                        id="firstName"
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className={fieldClass}>
                                    <label className={fieldLabelClass} htmlFor="lastName">Last Name</label>
                                    <input className={fieldInputClass}
                                        id="lastName"
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className={fieldClass}>
                                    <label className={fieldLabelClass} htmlFor="email">Email Address</label>
                                    <input className={fieldInputClass}
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className={fieldClass}>
                                    <label className={fieldLabelClass} htmlFor="phone">Phone Number</label>
                                    <input className={fieldInputClass}
                                        id="phone"
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Edit Action Buttons */}
                    {isEditing && (
                        <div className="mt-2 mb-10 flex justify-end gap-4 phone:flex-col-reverse phone:[&>button]:w-full">
                            <button
                                type="button"
                                className="cursor-pointer rounded-3xl border border-[#333] bg-white px-6 py-2.5 [font-family:inherit] text-[14px] font-bold text-[#333] enabled:hover:bg-hover"
                                onClick={handleCancel}
                                disabled={isSaving}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="cursor-pointer rounded-3xl border-0 bg-primary px-6 py-2.5 [font-family:inherit] text-[14px] font-bold text-white enabled:hover:bg-primary-hover"
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </form>

                {/* Password reset request */}
                <div className={cardClass}>
                    <h3 className="mb-3 text-[18px] font-bold text-ink">Password</h3>

                    <p className="mb-4 text-[14px] leading-[1.5] text-[#666]">
                        We can send a password reset link to your registered
                        email address{savedUser?.email ? ` (${savedUser.email})` : ''}.
                        Your password only changes after you open the link and
                        choose a new one.
                    </p>

                    <button
                        className={pillButtonClass}
                        type="button"
                        onClick={handleRequestReset}
                        disabled={isSendingReset || !savedUser}
                    >
                        {isSendingReset ? 'Sending...' : 'Reset Password'}
                    </button>

                    {resetNotice && (
                        <p
                            className={`mt-4 text-[14px] font-medium ${noticeColors[resetNotice.type]}`}
                            role={resetNotice.type === 'error' ? 'alert' : 'status'}
                        >
                            {resetNotice.text}
                        </p>
                    )}
                </div>
            </main>
        </div>
    );
}

export default Profile;
