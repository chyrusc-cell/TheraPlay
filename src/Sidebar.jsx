import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import {
    House,
    Gamepad2,
    ChartNoAxesColumn,
    User,
    ClipboardList,
    Contact,
    Users,
    Mail,
    LogOut
} from 'lucide-react';

import { useAuth } from './authContext.js';
import ConfirmDialog from './ConfirmDialog.jsx';

import logoFull from '../img/theraplaylogo2.png';
import logoIcon from '../img/theraplaylogo.png';

import './css/Sidebar.css';

const API_URL = 'http://127.0.0.1:8000/api';

const linkClass = ({ isActive }) =>
    isActive ? 'sidebar-link active' : 'sidebar-link';

function Sidebar() {
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // The role comes from the server (GET /api/user), not from the browser.
    // Hiding links is only a convenience: Laravel enforces access.
    const { status, user } = useAuth();
    const isAdmin = user?.role === 'admin';

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
                {isAdmin && (
                    <>
                        <NavLink
                            to="/professional-dashboard"
                            end
                            title="Admin Dashboard"
                            className={linkClass}
                        >
                            <House size={20} aria-hidden="true" />
                            <span>Dashboard</span>
                        </NavLink>

                        <NavLink
                            to="/manage-activities"
                            title="Manage Activities"
                            className={linkClass}
                        >
                            <ClipboardList size={20} aria-hidden="true" />
                            <span>Manage Activities</span>
                        </NavLink>

                        <NavLink
                            to="/manage-contacts"
                            title="Manage Contacts"
                            className={linkClass}
                        >
                            <Contact size={20} aria-hidden="true" />
                            <span>Manage Contacts</span>
                        </NavLink>

                        <NavLink
                            to="/manage-accounts"
                            title="Manage Accounts"
                            className={linkClass}
                        >
                            <Users size={20} aria-hidden="true" />
                            <span>Manage Accounts</span>
                        </NavLink>

                        <NavLink
                            to="/profile"
                            title="Profile"
                            className={linkClass}
                        >
                            <User size={20} aria-hidden="true" />
                            <span>Profile</span>
                        </NavLink>
                    </>
                )}

                {/* Parent links; nothing is shown until the role is verified. */}
                {status !== 'loading' && !isAdmin && (
                <>
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

                <NavLink
                    to="/contact"
                    title="Contact Us"
                    className={linkClass}
                >
                    <Mail size={20} aria-hidden="true" />
                    <span>Contact Us</span>
                </NavLink>
                </>
                )}
            </nav>

            <div className="sidebar-bottom">
                <button
                    type="button"
                    className="sidebar-logout"
                    title="Logout"
                    onClick={() => setShowLogoutConfirm(true)}
                    disabled={isLoggingOut}
                >
                    <LogOut size={20} aria-hidden="true" />
                    <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                </button>
            </div>

            {/* Logging out only starts after the user confirms here. */}
            <ConfirmDialog
                open={showLogoutConfirm}
                title="Log out?"
                message="Are you sure you want to log out of TheraPlay?"
                confirmLabel="Log Out"
                busyLabel="Logging out..."
                busy={isLoggingOut}
                onConfirm={handleLogout}
                onCancel={() => setShowLogoutConfirm(false)}
            />
        </aside>
    );
}

export default Sidebar;
