import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { API_URL, clearSession } from './api.js';
import { useAuth } from './authContext.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import { CurrentUserAvatar } from './ProfileAvatar.jsx';

const itemClass =
    'flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-0 bg-transparent px-3 py-2.5 text-left [font-family:inherit] text-[14px] font-medium no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-60';

/*
 * The profile icon at the top-right. It opens a small menu with two choices for
 * every signed-in account (parent or administrator): Profile (the same /profile
 * page for both) and Logout. Logout is the app's one logout: it asks first, ends
 * the session on the server, then clears the browser's login (this also forgets
 * the selected child) and returns to the login page.
 *
 * The menu closes on a second click of the icon, a click outside, Escape, or
 * after choosing an item.
 */
function ProfileMenu() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const containerRef = useRef(null);
    const triggerRef = useRef(null);
    const menuId = useId();

    // Close on an outside click or Escape (focus goes back to the icon).
    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const handleMouseDown = (event) => {
            if (!containerRef.current?.contains(event.target)) {
                setOpen(false);
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
                triggerRef.current?.focus();
                return;
            }

            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                const items = [...(containerRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') ?? [])];

                if (items.length === 0) {
                    return;
                }

                event.preventDefault();

                const index = items.indexOf(document.activeElement);
                const next = event.key === 'ArrowDown'
                    ? (index + 1) % items.length
                    : (index - 1 + items.length) % items.length;

                items[next].focus();
            }
        };

        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    const askToLogOut = () => {
        setOpen(false);
        // Focus returns here when the confirmation closes.
        triggerRef.current?.focus();
        setShowLogoutConfirm(true);
    };

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
        // (This also forgets the selected child.)
        clearSession();

        navigate('/login', { replace: true, state: { message } });
    };

    return (
        // Fixed to the viewport so it stays at the top-right while the page scrolls.
        // top-[11px] centres it on the search pill (8px offset + 44px tall); the search
        // pill always leaves room on the right so the two never overlap. z-40 matches the
        // pill and stays below dialogs and the search dropdown.
        <div ref={containerRef} className="fixed top-[11px] right-7 z-40 tablet:right-4">

            <button
                ref={triggerRef}
                type="button"
                className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center overflow-hidden rounded-full border btn-glass p-0 text-muted"
                onClick={() => setOpen((value) => !value)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                aria-label="Open profile menu"
                title="Profile menu"
            >
                <CurrentUserAvatar />
            </button>

            {open && (
                <div
                    id={menuId}
                    role="menu"
                    aria-label="Profile menu"
                    className="absolute top-full right-0 z-50 mt-2 w-[240px] max-w-[calc(100vw-24px)] animate-[ui-pop-in_0.18s_ease-out] rounded-2xl glass-panel p-1.5"
                >
                    {/* Who is signed in (read from the verified account). */}
                    {(user?.name || user?.email) && (
                        <div className="mb-1 border-b border-edge px-3 pt-1.5 pb-2.5">
                            {user?.name && (
                                <p className="truncate text-[14px] font-bold text-ink">{user.name}</p>
                            )}
                            {user?.email && (
                                <p className="truncate text-[12px] text-muted">{user.email}</p>
                            )}
                        </div>
                    )}

                    <Link
                        to="/profile"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className={`${itemClass} text-ink hover:bg-hover active:bg-accent-soft`}
                    >
                        <User size={18} aria-hidden="true" className="shrink-0" />
                        Profile
                    </Link>

                    <button
                        type="button"
                        role="menuitem"
                        onClick={askToLogOut}
                        disabled={isLoggingOut}
                        className={`${itemClass} text-danger-text enabled:hover:bg-danger-bg enabled:active:bg-danger-bg`}
                    >
                        <LogOut size={18} aria-hidden="true" className="shrink-0" />
                        Logout
                    </button>
                </div>
            )}

            {/* Logging out only starts after the user confirms here. */}
            <ConfirmDialog
                open={showLogoutConfirm}
                title="Log out?"
                message="Are you sure you want to log out of TheraPlay?"
                confirmLabel="Log Out"
                confirmVariant="danger"
                busyLabel="Logging out..."
                busy={isLoggingOut}
                onConfirm={handleLogout}
                onCancel={() => setShowLogoutConfirm(false)}
            />

        </div>
    );
}

export default ProfileMenu;
