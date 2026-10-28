import { Link, Outlet } from 'react-router-dom';
import { User } from 'lucide-react';
import Sidebar from './Sidebar.jsx';
import AuthProvider from './AuthProvider.jsx';
import GlobalSearch from './GlobalSearch.jsx';

function Layout() {
    return (
        <AuthProvider>
            {/*
              The app area sets its own background and font, because every old
              page stylesheet sets a global "body" background and the winner
              would otherwise depend on bundle order.
            */}
            <div className="min-h-screen w-full bg-[#f7f8fa] font-[Quicksand,sans-serif]">
                <Sidebar />

                {/*
                  The global search is a floating glass pill (it positions
                  itself, see GlobalSearch.jsx). There is no header bar behind
                  it.
                */}
                <GlobalSearch />

                {/* Everything to the right of the fixed sidebar. */}
                <div className="ml-sidebar flex min-h-screen min-w-0 flex-col tablet:ml-sidebar-rail">
                    {/*
                      A plain row with no background. It only keeps the space at
                      the top where the floating search sits, so page content
                      starts below it, and holds the profile shortcut.
                    */}
                    <div className="flex h-topbar shrink-0 items-center justify-end px-7 tablet:px-4">
                        <Link
                            to="/profile"
                            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full border border-[#dedede] bg-[#e9ecef] text-muted no-underline transition-[background-color,box-shadow] duration-150 hover:bg-[#dfe3e7] hover:shadow-[0_0_0_3px_rgba(0,0,0,0.05)]"
                            aria-label="Open profile"
                            title="Profile"
                        >
                            <User size={18} aria-hidden="true" />
                        </Link>
                    </div>

                    <main className="min-w-0 flex-1">
                        <Outlet />
                    </main>
                </div>
            </div>
        </AuthProvider>
    );
}

export default Layout;
