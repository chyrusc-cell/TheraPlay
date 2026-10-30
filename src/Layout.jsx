import { Link } from 'react-router-dom';
import GatedOutlet from './GatedOutlet.jsx';
import SessionWatcher from './SessionWatcher.jsx';
import Sidebar from './Sidebar.jsx';
import AuthProvider from './AuthProvider.jsx';
import ChildProvider from './ChildProvider.jsx';
import ChildSelector from './ChildSelector.jsx';
import GlobalSearch from './GlobalSearch.jsx';
import { CurrentUserAvatar } from './ProfileAvatar.jsx';

function Layout() {
    return (
        <AuthProvider>
            <ChildProvider>
            <SessionWatcher />
            {/*
              The app area sets its own background and font, because every old
              page stylesheet sets a global "body" background and the winner
              would otherwise depend on bundle order.
            */}
            <div className="min-h-screen w-full font-[Quicksand,sans-serif]">
                {/* First tab stop: lets keyboard users jump past the navigation and search. */}
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-full focus:btn-solid focus:px-4 focus:py-2 focus:text-[14px] focus:font-bold focus:no-underline"
                >
                    Skip to main content
                </a>

                <Sidebar />

                {/*
                  The global search is a floating glass pill (it positions
                  itself, see GlobalSearch.jsx). There is no header bar behind
                  it.
                */}
                {/*
                  The three floating top controls share one header landmark.
                  The header itself takes no space: everything inside is fixed.
                */}
                <header>
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
                {/* The global Choose Child switcher (parents only). */}
                <ChildSelector />

                <Link
                    to="/profile"
                    className="fixed top-[11px] right-7 z-40 flex h-[38px] w-[38px] items-center overflow-hidden justify-center rounded-full border border-white/70 btn-glass text-muted no-underline tablet:right-4"
                    aria-label="Open profile"
                    title="Profile"
                >
                    <CurrentUserAvatar />
                </Link>
                </header>

                {/* Everything to the right of the fixed sidebar. */}
                <div className="ml-sidebar flex min-h-screen min-w-0 flex-col tablet:ml-sidebar-rail">
                    {/*
                      An empty row that only keeps the space at the top where the
                      floating search and profile shortcut sit, so page content
                      starts below them.
                    */}
                    <div className="h-topbar shrink-0" aria-hidden="true" />

                    <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
                        <GatedOutlet />
                    </main>
                </div>
            </div>
            </ChildProvider>
        </AuthProvider>
    );
}

export default Layout;
