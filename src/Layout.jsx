import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import './css/Layout.css';

function Layout() {

    return (
        <div className="layout">

            <Sidebar />

            <main className="main-content">
                <Outlet />
            </main>

        </div>
    );
}

export default Layout;