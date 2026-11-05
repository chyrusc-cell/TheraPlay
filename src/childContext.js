import { createContext, useContext } from 'react';

// The parent's children and the ONE child that is currently selected for the
// whole app (Activities, Dashboard, Progress, completing activities).
// status: 'idle' (not a parent) | 'loading' | 'ready' | 'error'
export const ChildContext = createContext({
    children: [],
    selectedChild: null,
    selectedChildId: null,
    status: 'idle',
    selectChild: () => {},
    refreshChildren: async () => [],
});

export const useChildren = () => useContext(ChildContext);

// The remembered choice is only a preference (one key per account). The child
// list from the server decides whether it is valid; it never grants access.
export const SELECTED_CHILD_KEY_PREFIX = 'theraplay_selected_child:';
