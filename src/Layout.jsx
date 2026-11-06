import GatedOutlet from './GatedOutlet.jsx';
import VerificationBanner from './VerificationBanner.jsx';
import SessionWatcher from './SessionWatcher.jsx';
import Sidebar from './Sidebar.jsx';
import AuthProvider from './AuthProvider.jsx';
import ChildProvider from './ChildProvider.jsx';
import ChildSelector from './ChildSelector.jsx';
import GlobalSearch from './GlobalSearch.jsx';
import ProfileMenu from './ProfileMenu.jsx';

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
                    className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-full focus:btn-glass focus:px-4 focus:py-2 focus:text-[14px] focus:font-bold focus:no-underline"
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

                {/* The global Choose Child switcher (parents only). */}
                <ChildSelector />

                <ProfileMenu />
                </header>

                {/* Everything to the right of the fixed sidebar. */}
                <div className="ml-sidebar-offset flex min-h-screen min-w-0 flex-col tablet:ml-sidebar-offset-rail phone:ml-0 phone:pb-24">
                    {/*
                      An empty row that only keeps the space at the top where the
                      floating search and profile shortcut sit, so page content
                      starts below them.
                    */}
                    <div className="h-topbar shrink-0" aria-hidden="true" />

                    <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
                        <VerificationBanner />
                        <GatedOutlet />
                    </main>
                </div>
            </div>
            </ChildProvider>
        </AuthProvider>
    );
}

export default Layout;
