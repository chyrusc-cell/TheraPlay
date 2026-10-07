import { useState } from 'react';
import { Link } from 'react-router-dom';
import './css/Profile.css';

function Profile() {

    const [isEditing, setIsEditing] = useState(false);

    const [name, setName] = useState('Juan Dela Cruz');
    const [email, setEmail] = useState('juan@example.com');

    const handleSave = (event) => {

        event.preventDefault();

        setIsEditing(false);

        alert('Profile updated successfully!');
    };

    return (
        <div className="profile-page">

            <main className="profile-content">

                <div className="profile-header">

                    <h1>
                        My Profile
                    </h1>

                    <p>
                        View and manage your TheraPlay account information.
                    </p>

                </div>

                <section className="profile-card">

                    <div className="profile-avatar">
                        JD
                    </div>

                    {!isEditing ? (

                        <div className="profile-information">

                            <div className="profile-field">

                                <span className="field-label">
                                    Full Name
                                </span>

                                <span className="field-value">
                                    {name}
                                </span>

                            </div>

                            <div className="profile-field">

                                <span className="field-label">
                                    Email
                                </span>

                                <span className="field-value">
                                    {email}
                                </span>

                            </div>

                            <div className="profile-field">

                                <span className="field-label">
                                    Account Type
                                </span>

                                <span className="field-value">
                                    Customer
                                </span>

                            </div>

                            <button
                                className="edit-profile-button"
                                onClick={() => setIsEditing(true)}
                            >
                                Edit Profile
                            </button>

                        </div>

                    ) : (

                        <form
                            className="profile-form"
                            onSubmit={handleSave}
                        >

                            <div className="form-group">

                                <label>
                                    Full Name
                                </label>

                                <input
                                    type="text"
                                    value={name}
                                    onChange={(event) =>
                                        setName(event.target.value)
                                    }
                                    required
                                />

                            </div>

                            <div className="form-group">

                                <label>
                                    Email
                                </label>

                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                    required
                                />

                            </div>

                            <div className="form-actions">

                                <button
                                    type="submit"
                                    className="save-profile-button"
                                >
                                    Save Changes
                                </button>

                                <button
                                    type="button"
                                    className="cancel-profile-button"
                                    onClick={() => setIsEditing(false)}
                                >
                                    Cancel
                                </button>

                            </div>

                        </form>

                    )}

                </section>

                <section className="account-section">

                    <h2>
                        Account
                    </h2>

                    <div className="account-options">

                        <Link to="/forgot-password">
                            Change Password
                        </Link>

                    </div>

                </section>

            </main>

        </div>
    );
}

export default Profile;