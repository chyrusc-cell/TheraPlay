import { Link, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import AuthProvider from './AuthProvider.jsx';
import GlobalSearch from './GlobalSearch.jsx';
import { CurrentUserAvatar } from './ProfileAvatar.jsx';

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

                {/*
                  The profile shortcut is fixed to the viewport, so it stays at
                  the top-right while the page scrolls (it used to sit in the
                  scrolling page flow). top-[11px] centres it on the search
                  pill (8px offset + 44px tall); right-7 matches the old row
                  padding. The search pill always leaves 90px free on the right,
                  so the two never overlap. z-40 matches the pill and stays
                  below dialogs and the search dropdown.
                */}
                <Link
                    to="/profile"
                    className="fixed top-[11px] right-7 z-40 flex h-[38px] w-[38px] items-center overflow-hidden justify-center rounded-full border border-[#dedede] bg-[#e9ecef] text-muted no-underline transition-[background-color,box-shadow] duration-150 hover:bg-[#dfe3e7] hover:shadow-[0_0_0_3px_rgba(0,0,0,0.05)] tablet:right-4"
                    aria-label="Open profile"
                    title="Profile"
                >
                    <CurrentUserAvatar />
                </Link>

                {/* Everything to the right of the fixed sidebar. */}
                <div className="ml-sidebar flex min-h-screen min-w-0 flex-col tablet:ml-sidebar-rail">
                    {/*
                      An empty row that only keeps the space at the top where the
                      floating search and profile shortcut sit, so page content
                      starts below them.
                    */}
                    <div className="h-topbar shrink-0" aria-hidden="true" />

                    <main className="min-w-0 flex-1">
                        <Outlet />
                    </main>
                </div>
            </div>
        </AuthProvider>
    );
}

export default Layout;
