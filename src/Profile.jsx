import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/Profile.css';

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

function Profile() {
    const navigate = useNavigate();

    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

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

    const roleLabel = savedUser?.role
        ? savedUser.role.charAt(0).toUpperCase() + savedUser.role.slice(1)
        : '';

    if (isLoading) {
        return (
            <div className="profile-page">
                <main className="profile-content">
                    <p>Loading your profile...</p>
                </main>
            </div>
        );
    }

    return (
        <div className="profile-page">
            <main className="profile-content">
                <div className="profile-header">
                    <h1>My Profile</h1>

                    {!isEditing && savedUser && (
                        <button
                            className="btn-edit-pill"
                            type="button"
                            onClick={() => setIsEditing(true)}
                        >
                            Edit
                        </button>
                    )}
                </div>

                {/* Profile Avatar Card */}
                <div className="card top-profile-card">
                    <div className="avatar-wrapper">
                        <div className="profile-avatar-large"></div>

                        {isEditing && (
                            <button
                                className="avatar-edit-icon"
                                type="button"
                                aria-label="Edit avatar"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    width="12"
                                    height="12"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    fill="none"
                                >
                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                </svg>
                            </button>
                        )}
                    </div>

                    <div className="profile-titles">
                        <h2>{firstName} {lastName}</h2>
                        <p>{roleLabel}</p>
                    </div>
                </div>

                {message && (
                    <p
                        role="alert"
                        style={{
                            color: isError ? '#d93025' : '#188038',
                            margin: '0 0 16px',
                            fontSize: '14px',
                            fontWeight: 500,
                        }}
                    >
                        {message}
                    </p>
                )}

                {/* Personal Information Card */}
                <form onSubmit={handleSave}>
                    <div className="card bottom-profile-card">
                        <h3>Personal Information</h3>

                        {!isEditing ? (
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">First Name</span>
                                    <span className="info-value">{firstName}</span>
                                </div>

                                <div className="info-item">
                                    <span className="info-label">Last Name</span>
                                    <span className="info-value">{lastName}</span>
                                </div>

                                <div className="info-item">
                                    <span className="info-label">Email Address</span>
                                    <span className="info-value">{email}</span>
                                </div>

                                <div className="info-item">
                                    <span className="info-label">Phone Number</span>
                                    <span className="info-value">{phone}</span>
                                </div>

                            </div>
                        ) : (
                            <div className="info-grid">
                                <div className="input-group">
                                    <label htmlFor="firstName">First Name</label>
                                    <input
                                        id="firstName"
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label htmlFor="lastName">Last Name</label>
                                    <input
                                        id="lastName"
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label htmlFor="email">Email Address</label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label htmlFor="phone">Phone Number</label>
                                    <input
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
                        <div className="form-actions-row">
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={handleCancel}
                                disabled={isSaving}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="btn-save"
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </form>
            </main>
        </div>
    );
}

export default Profile;
