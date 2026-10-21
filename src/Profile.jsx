import { useState } from 'react';
import { Link } from 'react-router-dom';
import './css/Profile.css';

function Profile() {
    // State to toggle edit mode
    const [isEditing, setIsEditing] = useState(false);

    // Profile data state
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
        // In a real app, you might want to reset the state back to original values here
        setIsEditing(false);
    };

    return (
        <div className="profile-page">
            
            <nav className="navbar">
                <div className="navbar-logo-section">
                    <Link to="/dashboard" className="logo-link">
                        <img 
                            src="./img/theraplaylogo2.png"
                            alt="TheraPlay Logo" 
                            className="navbar-logo-image" 
                        />
                    </Link>
                </div>
                
                <div className="navbar-links">
                    <Link to="/dashboard">Home</Link>
                    <Link to="/activities">Activities</Link>
                    <Link to="/progress">My Progress</Link>
                    <Link to="/profile" className="active">Profile</Link>
                    <Link to="/contact">Contact Us</Link>
                </div>
                
                <div className="navbar-actions">
                    <button className="icon-button">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                    <button className="icon-button">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                    </button>
                    <div className="user-avatar-small"></div>
                </div>
            </nav>

            <main className="profile-content">
                
                <div className="profile-header">
                    <h1>My Profile</h1>
                    {!isEditing && (
                        <button className="btn-edit-pill" onClick={() => setIsEditing(true)}>
                            Edit
                        </button>
                    )}
                </div>

                {/* Profile Avatar Card */}
                <div className="card top-profile-card">
                    <div className="avatar-wrapper">
                        <div className="profile-avatar-large"></div>
                        {isEditing && (
                            <button className="avatar-edit-icon" type="button" aria-label="Edit avatar">
                                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
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
                            // View Mode
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
                            // Edit Mode
                            <div className="info-grid">
                                <div className="input-group">
                                    <label>First Name</label>
                                    <input 
                                        type="text" 
                                        value={firstName} 
                                        onChange={(e) => setFirstName(e.target.value)} 
                                        required 
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Last Name</label>
                                    <input 
                                        type="text" 
                                        value={lastName} 
                                        onChange={(e) => setLastName(e.target.value)} 
                                        required 
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Email Address</label>
                                    <input 
                                        type="email" 
                                        value={email} 
                                        onChange={(e) => setEmail(e.target.value)} 
                                        required 
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Phone Number</label>
                                    <input 
                                        type="tel" 
                                        value={phone} 
                                        onChange={(e) => setPhone(e.target.value)} 
                                        required 
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Home Address</label>
                                    <input 
                                        type="text" 
                                        value={address} 
                                        onChange={(e) => setAddress(e.target.value)} 
                                        required 
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Gender</label>
                                    <input 
                                        type="text" 
                                        value={gender} 
                                        onChange={(e) => setGender(e.target.value)} 
                                        required 
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons for Edit Mode */}
                    {isEditing && (
                        <div className="form-actions-row">
                            <button type="button" className="btn-cancel" onClick={handleCancel}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-save">
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