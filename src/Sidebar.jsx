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

const API_URL = 'http://127.0.0.1:8000/api';

// Below 900px the sidebar becomes an icon-only rail: labels stay for screen
// readers (sr-only) and the icon is centered. Active and inactive links are
// written out in full so no two classes set the same property.
const linkCommon =
    'flex items-center gap-3 rounded-lg px-[15px] py-3 text-[15px] whitespace-nowrap no-underline transition-colors tablet:justify-center tablet:px-2';

const linkClass = ({ isActive }) =>
    isActive
        ? `${linkCommon} bg-[#e9ecef] font-bold text-primary`
        : `${linkCommon} font-medium text-[#555] hover:bg-hover`;

const labelClass = 'tablet:sr-only';

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
        <aside className="fixed inset-y-0 left-0 z-[100] flex w-sidebar flex-col overflow-y-auto border-r border-[#e5e5e5] bg-white px-5 py-[30px] tablet:w-sidebar-rail tablet:items-center tablet:px-2 tablet:py-5">
            <div className="mb-10 px-[15px] tablet:mb-7 tablet:w-full tablet:p-0">
                <img
                    src={logoFull}
                    alt="TheraPlay"
                    className="block h-auto w-full max-w-[180px] tablet:sr-only"
                />
                <img
                    src={logoIcon}
                    alt=""
                    aria-hidden="true"
                    className="hidden h-auto w-full max-w-14 tablet:mx-auto tablet:block"
                />
            </div>

            <nav className="flex flex-col gap-2 tablet:w-full" aria-label="Main navigation">
                {isAdmin && (
                    <>
                        <NavLink
                            to="/professional-dashboard"
                            end
                            title="Admin Dashboard"
                            className={linkClass}
                        >
                            <House size={20} aria-hidden="true" className="shrink-0" />
                            <span className={labelClass}>Dashboard</span>
                        </NavLink>

                        <NavLink
                            to="/manage-activities"
                            title="Manage Activities"
                            className={linkClass}
                        >
                            <ClipboardList size={20} aria-hidden="true" className="shrink-0" />
                            <span className={labelClass}>Manage Activities</span>
                        </NavLink>

                        <NavLink
                            to="/manage-contacts"
                            title="Manage Contacts"
                            className={linkClass}
                        >
                            <Contact size={20} aria-hidden="true" className="shrink-0" />
                            <span className={labelClass}>Manage Contacts</span>
                        </NavLink>

                        <NavLink
                            to="/manage-accounts"
                            title="Manage Accounts"
                            className={linkClass}
                        >
                            <Users size={20} aria-hidden="true" className="shrink-0" />
                            <span className={labelClass}>Manage Accounts</span>
                        </NavLink>

                        <NavLink
                            to="/profile"
                            title="Profile"
                            className={linkClass}
                        >
                            <User size={20} aria-hidden="true" className="shrink-0" />
                            <span className={labelClass}>Profile</span>
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
                    <House size={20} aria-hidden="true" className="shrink-0" />
                    <span className={labelClass}>Home</span>
                </NavLink>

                <NavLink
                    to="/activities"
                    title="Activities"
                    className={linkClass}
                >
                    <Gamepad2 size={20} aria-hidden="true" className="shrink-0" />
                    <span className={labelClass}>Activities</span>
                </NavLink>

                <NavLink
                    to="/progress"
                    title="My Progress"
                    className={linkClass}
                >
                    <ChartNoAxesColumn size={20} aria-hidden="true" className="shrink-0" />
                    <span className={labelClass}>My Progress</span>
                </NavLink>

                <NavLink
                    to="/profile"
                    title="Profile"
                    className={linkClass}
                >
                    <User size={20} aria-hidden="true" className="shrink-0" />
                    <span className={labelClass}>Profile</span>
                </NavLink>

                <NavLink
                    to="/contact"
                    title="Contact Us"
                    className={linkClass}
                >
                    <Mail size={20} aria-hidden="true" className="shrink-0" />
                    <span className={labelClass}>Contact Us</span>
                </NavLink>
                </>
                )}
            </nav>

            <div className="mt-auto pt-5 tablet:w-full">
                <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-0 bg-transparent px-[15px] py-3 text-left [font-family:inherit] text-[15px] font-medium whitespace-nowrap text-[#555] enabled:hover:bg-danger-bg enabled:hover:text-danger-text tablet:justify-center tablet:px-2"
                    title="Logout"
                    onClick={() => setShowLogoutConfirm(true)}
                    disabled={isLoggingOut}
                >
                    <LogOut size={20} aria-hidden="true" className="shrink-0" />
                    <span className={labelClass}>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
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
