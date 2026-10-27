import { createContext, useContext } from 'react';

// status: 'loading' | 'authenticated' | 'unauthenticated' | 'error'
// user is the verified user returned by GET /api/user (null until verified).
export const AuthContext = createContext({
    status: 'loading',
    user: null,
    retry: () => {},
});

export const useAuth = () => useContext(AuthContext);
