import { NavLink, Link } from 'react-router-dom';

import {
    House,
    Gamepad2,
    ChartNoAxesColumn,
    User,
    LogOut
} from 'lucide-react';

import './css/Sidebar.css';

function Sidebar() {

    return (
        <aside className="sidebar">

            <div className="sidebar-logo">
                TheraPlay
            </div>

            <nav className="sidebar-navigation">

                <NavLink
                    to="/dashboard"
                    className="sidebar-link"
                >
                    <House size={20} />
                    <span>Home</span>
                </NavLink>

                <NavLink
                    to="/activities"
                    className="sidebar-link"
                >
                    <Gamepad2 size={20} />
                    <span>Activities</span>
                </NavLink>

                <NavLink
                    to="/progress"
                    className="sidebar-link"
                >
                    <ChartNoAxesColumn size={20} />
                    <span>My Progress</span>
                </NavLink>

                <NavLink
                    to="/profile"
                    className="sidebar-link"
                >
                    <User size={20} />
                    <span>Profile</span>
                </NavLink>

            </nav>

            <div className="sidebar-bottom">

                <Link
                    to="/login"
                    className="sidebar-logout"
                >
                    <LogOut size={20} />
                    <span>Logout</span>
                </Link>

            </div>

        </aside>
    );
}

export default Sidebar;