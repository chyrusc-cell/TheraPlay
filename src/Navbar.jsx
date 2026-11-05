import { Link, NavLink } from 'react-router-dom';
import './css/NavBar.css';

function Navbar() {
    return (
        <nav className="navbar">
            <div className="navbar-logo-section">
                <Link to="/dashboard" className="logo-link">
                    <img
                        src="/img/theraplaylogo2.png"
                        alt="TheraPlay Logo"
                        className="navbar-logo-image"
                    />
                </Link>
            </div>

            <div className="navbar-links">
                <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                        isActive ? 'active' : ''
                    }
                >
                    Home
                </NavLink>

                <NavLink
                    to="/activities"
                    className={({ isActive }) =>
                        isActive ? 'active' : ''
                    }
                >
                    Activities
                </NavLink>

                <NavLink
                    to="/progress"
                    className={({ isActive }) =>
                        isActive ? 'active' : ''
                    }
                >
                    My Progress
                </NavLink>

                <NavLink
                    to="/profile"
                    className={({ isActive }) =>
                        isActive ? 'active' : ''
                    }
                >
                    Profile
                </NavLink>

                <NavLink
                    to="/contact"
                    className={({ isActive }) =>
                        isActive ? 'active' : ''
                    }
                >
                    Contact Us
                </NavLink>
            </div>

            <div className="navbar-actions">
                <Link
                    to="/settings"
                    className="icon-button"
                    aria-label="Settings"
                    title="Settings"
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                    >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                </Link>

                <button
                    type="button"
                    className="icon-button"
                    aria-label="Notifications"
                    title="Notifications"
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                    >
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                </button>

                <Link
                    to="/profile"
                    className="user-avatar"
                    aria-label="Open profile"
                    title="Profile"
                />
            </div>
        </nav>
    );
}

export default Navbar;
