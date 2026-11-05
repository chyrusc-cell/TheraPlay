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

// The one sign-up stage a parent is FORCED into: after the email is verified, the
// first child profile. An unverified parent is not forced anywhere: they can log
// in and browse (the server refuses their transactions) and verify whenever they
// like at /verify-code (the server decides the stage: user.onboarding).
export const ONBOARDING_PATHS = {
    create_child: '/create-child',
};

export const VERIFY_CODE_PATH = '/verify-code';

// Is this a parent whose email address is not verified yet?
export const isUnverifiedParent = (user) =>
    user?.role === 'parent' && user?.email_verified === false;

// Where an account belongs after logging in (the role and the sign-up stage are the
// server's): admins to the admin dashboard, a verified parent without a child to
// the child profile, everyone else (including an unverified parent, who browses
// with a verification reminder) to the dashboard.
export const homeFor = (user) =>
    user?.role === 'admin'
        ? '/professional-dashboard'
        : ONBOARDING_PATHS[user?.onboarding] || '/dashboard';
