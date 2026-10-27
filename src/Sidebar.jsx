import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import {
    House,
    Gamepad2,
    ChartNoAxesColumn,
    User,
    LogOut
} from 'lucide-react';

import logoFull from '../img/theraplaylogo2.png';
import logoIcon from '../img/theraplaylogo.png';

import './css/Sidebar.css';

const API_URL = 'http://127.0.0.1:8000/api';

const linkClass = ({ isActive }) =>
    isActive ? 'sidebar-link active' : 'sidebar-link';

function Sidebar() {
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        if (isLoggingOut) {
            return;
        }

        setIsLoggingOut(true);

        // Same storage that Login.jsx writes to.
        const token =
            localStorage.getItem('theraplay_token') ||
            sessionStorage.getItem('theraplay_token');

        let message = 'You have been logged out.';

        try {
            if (token) {
                const response = await fetch(`${API_URL}/logout`, {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                });

                // 401 means the token was already invalid, which is fine.
                if (!response.ok && response.status !== 401) {
                    message =
                        'You were logged out on this device, but the server could not end the session.';
                }
            }
        } catch {
            message =
                'You were logged out on this device, but the server could not be reached to end the session.';
        }

        // Always clear the browser's copy so the user is logged out here.
        ['theraplay_token', 'theraplay_user'].forEach((key) => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        navigate('/login', { replace: true, state: { message } });
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <img
                    src={logoFull}
                    alt="TheraPlay"
                    className="sidebar-logo-full"
                />
                <img
                    src={logoIcon}
                    alt=""
                    aria-hidden="true"
                    className="sidebar-logo-short"
                />
            </div>

            <nav className="sidebar-navigation" aria-label="Main navigation">
                <NavLink
                    to="/dashboard"
                    end
                    title="Dashboard"
                    className={linkClass}
                >
                    <House size={20} aria-hidden="true" />
                    <span>Home</span>
                </NavLink>

                <NavLink
                    to="/activities"
                    title="Activities"
                    className={linkClass}
                >
                    <Gamepad2 size={20} aria-hidden="true" />
                    <span>Activities</span>
                </NavLink>

                <NavLink
                    to="/progress"
                    title="My Progress"
                    className={linkClass}
                >
                    <ChartNoAxesColumn size={20} aria-hidden="true" />
                    <span>My Progress</span>
                </NavLink>

                <NavLink
                    to="/profile"
                    title="Profile"
                    className={linkClass}
                >
                    <User size={20} aria-hidden="true" />
                    <span>Profile</span>
                </NavLink>
            </nav>

            <div className="sidebar-bottom">
                <button
                    type="button"
                    className="sidebar-logout"
                    title="Logout"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                >
                    <LogOut size={20} aria-hidden="true" />
                    <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
