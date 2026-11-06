import { NavLink } from 'react-router-dom';

import {
    House,
    Gamepad2,
    ChartNoAxesColumn,
    User,
    ClipboardList,
    Contact,
    Users,
    Mail
} from 'lucide-react';

import { useAuth } from './authContext.js';

import { logo } from './brand.js';

// Below 900px the sidebar becomes an icon-only rail: labels stay for screen
// readers (sr-only) and the icon is centered. Active and inactive links are
// written out in full so no two classes set the same property.
const linkCommon =
    'flex items-center gap-3 rounded-xl px-[14px] py-[11px] text-[15px] whitespace-nowrap no-underline tablet:justify-center tablet:rounded-2xl tablet:px-[6px] phone:px-[11px] phone:py-[13px]';

const linkClass = ({ isActive }) =>
    isActive
        ? `${linkCommon} nav-glow nav-item-active font-bold`
        : `${linkCommon} nav-glow nav-item font-medium text-body`;

const labelClass = 'tablet:sr-only';

function Sidebar() {
    // The role comes from the server (GET /api/user), not from the browser.
    // Hiding links is only a convenience: Laravel enforces access.
    const { status, user } = useAuth();
    const isAdmin = user?.role === 'admin';

    return (
        <aside className="fixed top-sidebar-gap bottom-sidebar-gap left-sidebar-gap z-[100] flex w-sidebar flex-col overflow-y-auto rounded-[24px] border card-soft px-5 py-[30px] tablet:rounded-[20px] tablet:w-sidebar-rail tablet:items-center tablet:px-2 tablet:py-5 phone:top-auto phone:right-sidebar-gap phone:h-16 phone:w-auto phone:flex-row phone:items-center phone:justify-center phone:overflow-visible phone:rounded-[22px] phone:px-3 phone:py-1">
            <div className="mb-10 px-[15px] tablet:mb-7 tablet:w-full tablet:p-0 phone:hidden">
                <img
                    src={logo}
                    alt="TheraPlay"
                    className="block h-auto w-full max-w-[180px] tablet:sr-only"
                />
                {/* The narrow rail shows only the icon part (the left, square end) of the same logo. */}
                <img
                    src={logo}
                    alt=""
                    aria-hidden="true"
                    className="hidden h-10 w-10 object-cover object-left tablet:mx-auto tablet:block"
                />
            </div>

            <nav className="flex flex-col gap-2 tablet:w-full phone:w-auto phone:flex-1 phone:flex-row phone:justify-around phone:gap-0" aria-label="Main navigation">
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
        </aside>
    );
}

export default Sidebar;
