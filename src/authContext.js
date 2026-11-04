import { createContext, useContext } from 'react';

// status: 'loading' | 'authenticated' | 'unauthenticated' | 'error'
// user is the verified user returned by GET /api/user (null until verified).
export const AuthContext = createContext({
    status: 'loading',
    user: null,
    retry: () => {},
    // Merges fields into the verified user (for example a new photo_url).
    updateUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

// Where a new parent still has to go to finish signing up (the server decides the
// stage: user.onboarding). A finished parent has no entry here.
export const ONBOARDING_PATHS = {
    verify_email: '/verify-code',
    create_child: '/create-child',
};

// Where an account belongs after logging in (the role and the sign-up stage are the
// server's): admins to the admin dashboard, an unverified parent to the email code,
// a verified parent without a child to the child profile, everyone else to the
// dashboard.
export const homeFor = (user) =>
    user?.role === 'admin'
        ? '/professional-dashboard'
        : ONBOARDING_PATHS[user?.onboarding] || '/dashboard';
