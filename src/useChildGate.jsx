import { useAuth } from './authContext.js';
import { useChildren } from './childContext.js';
import { ChildLoadError, NoChildPrompt } from './ChildStates.jsx';

// The part of a page that depends on the selected child, or null when the page
// can go ahead: 'wait' while the children load, otherwise the message to show.
export function useChildGate() {
    const { status, children, selectedChildId, selectedChild } = useChildren();
    const { status: authStatus, user } = useAuth();

    return {
        selectedChildId,
        selectedChild,
        childStatus: status,
        authStatus,
        // Only a verified parent has children (and only a parent may ask for a
        // child's data).
        isParent: authStatus === 'authenticated' && user?.role === 'parent',
        // Not enough is known yet to ask for anything child-specific: the login is
        // still being verified (until then nobody can tell whether this is a
        // parent), or a parent's children are still loading.
        waiting: authStatus === 'loading' || status === 'loading',
        blocked:
            status === 'ready' && children.length === 0 ? (
                <NoChildPrompt />
            ) : status === 'error' ? (
                <ChildLoadError />
            ) : null,
    };
}
