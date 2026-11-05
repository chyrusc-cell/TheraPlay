import { useState } from 'react';
import './css/Profile.css';

function Profile() {
    const [isEditing, setIsEditing] = useState(false);

    const [firstName, setFirstName] = useState('Frent Yvan');
    const [lastName, setLastName] = useState('Raz');
    const [email, setEmail] = useState('thegreatharold@gmail.com');
    const [phone, setPhone] = useState('+63 976 003 3605');
    const [address, setAddress] = useState('Perla, Montreal');
    const [gender, setGender] = useState('Male');

    const handleSave = (event) => {
        event.preventDefault();
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
    };

    return (
        <div className="profile-page">
            <main className="profile-content">
                <div className="profile-header">
                    <h1>My Profile</h1>

                    {!isEditing && (
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
                        <p>Client</p>
                    </div>
                </div>

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

                                <div className="info-item">
                                    <span className="info-label">Home Address</span>
                                    <span className="info-value">{address}</span>
                                </div>

                                <div className="info-item">
                                    <span className="info-label">Gender</span>
                                    <span className="info-value">{gender}</span>
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
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label htmlFor="address">Home Address</label>
                                    <input
                                        id="address"
                                        type="text"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="input-group">
                                    <label htmlFor="gender">Gender</label>
                                    <input
                                        id="gender"
                                        type="text"
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        required
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
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="btn-save"
                            >
                                Save Changes
                            </button>
                        </div>
                    )}
                </form>
            </main>
        </div>
    );
}

export default Profile;
