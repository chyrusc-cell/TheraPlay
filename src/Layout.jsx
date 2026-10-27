
import { Link, Outlet } from 'react-router-dom';
import { User } from 'lucide-react';
import Sidebar from './Sidebar.jsx';
import AuthProvider from './AuthProvider.jsx';
import './css/Layout.css';

function Layout() {
    return (
        <AuthProvider>
            <div className="layout">
                <Sidebar />

                <div className="main-area">
                    <div className="topbar">
                        <Link
                            to="/profile"
                            className="topbar-avatar"
                            aria-label="Open profile"
                            title="Profile"
                        >
                            <User size={18} aria-hidden="true" />
                        </Link>
                    </div>

                    <main className="main-content">
                        <Outlet />
                    </main>
                </div>
            </div>
        </AuthProvider>
    );
}

export default Layout;
