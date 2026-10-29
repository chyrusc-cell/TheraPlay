import { useChildren } from './childContext.js';
import { ChildLoadError, NoChildPrompt } from './ChildStates.jsx';

// The part of a page that depends on the selected child, or null when the page
// can go ahead: 'wait' while the children load, otherwise the message to show.
export function useChildGate() {
    const { status, children, selectedChildId, selectedChild } = useChildren();

    return {
        selectedChildId,
        selectedChild,
        childStatus: status,
        // Parent whose children are still loading.
        waiting: status === 'loading',
        blocked:
            status === 'ready' && children.length === 0 ? (
                <NoChildPrompt />
            ) : status === 'error' ? (
                <ChildLoadError />
            ) : null,
    };
}
