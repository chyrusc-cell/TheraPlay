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
