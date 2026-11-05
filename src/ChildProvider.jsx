import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './authContext.js';
import { ChildContext, SELECTED_CHILD_KEY_PREFIX } from './childContext.js';
import { apiRequest } from './api.js';

const readStored = (userId) => {
    try {
        const value = Number(localStorage.getItem(SELECTED_CHILD_KEY_PREFIX + userId));

        return Number.isInteger(value) && value > 0 ? value : null;
    } catch {
        return null;
    }
};

/*
 * The single shared source of truth for "which child is selected". It lives in
 * the shared layout (below AuthProvider) so every page sees the same choice.
 *  - The list always comes from GET /api/children (the parent's own children).
 *  - The last choice is restored from localStorage ONLY if that child is in the
 *    list; otherwise the first child is selected, or none if there are none.
 *  - The stored choice is removed on logout (clearSession) and is kept per
 *    account, so it can never carry over to another login.
 *  - Admins and guests have no children: status is 'idle'.
 */
function ChildProvider({ children: content }) {
    const { user } = useAuth();
    const isParent = user?.role === 'parent';
    const userId = user?.id;

    const [state, setState] = useState({
        list: [],
        selectedId: null,
        status: 'loading',
        forUser: null,
    });

    // Applies a freshly loaded list, keeping the current (or remembered) choice
    // when it is still one of the parent's children.
    const applyList = useCallback(
        (list) => {
            setState((previous) => {
                const candidates = [
                    previous.forUser === userId ? previous.selectedId : null,
                    readStored(userId),
                ];
                const keep = candidates.find(
                    (id) => id !== null && list.some((child) => child.id === id)
                );

                return {
                    list,
                    selectedId: keep ?? list[0]?.id ?? null,
                    status: 'ready',
                    forUser: userId,
                };
            });
        },
        [userId]
    );

    useEffect(() => {
        if (!isParent) {
            return undefined;
        }

        const controller = new AbortController();

        const load = async () => {
            try {
                const result = await apiRequest('/children', { signal: controller.signal });

                if (!result.ok) {
                    throw new Error('Unable to load the child profiles.');
                }

                applyList(Array.isArray(result.data.data) ? result.data.data : []);
            } catch (error) {
                if (error.name !== 'AbortError') {
                    setState((previous) => ({ ...previous, status: 'error', forUser: userId }));
                }
            }
        };

        load();

        return () => controller.abort();
    }, [isParent, userId, applyList]);

    // Remember the choice (a preference only).
    useEffect(() => {
        if (!isParent || state.forUser !== userId || state.status !== 'ready') {
            return;
        }

        try {
            if (state.selectedId === null) {
                localStorage.removeItem(SELECTED_CHILD_KEY_PREFIX + userId);
            } else {
                localStorage.setItem(SELECTED_CHILD_KEY_PREFIX + userId, String(state.selectedId));
            }
        } catch {
            // Storage unavailable: the choice just is not remembered.
        }
    }, [isParent, userId, state.forUser, state.status, state.selectedId]);

    const selectChild = useCallback((id) => {
        setState((previous) =>
            previous.list.some((child) => child.id === id)
                ? { ...previous, selectedId: id }
                : previous
        );
    }, []);

    // Reloads the list (after adding, editing or deleting a child). Resolves with
    // the list.
    const refreshChildren = useCallback(async () => {
        try {
            const result = await apiRequest('/children');

            if (!result.ok) {
                return [];
            }

            const list = Array.isArray(result.data.data) ? result.data.data : [];

            applyList(list);

            return list;
        } catch {
            return [];
        }
    }, [applyList]);

    const value = useMemo(() => {
        const current = isParent && state.forUser === userId;
        const list = current ? state.list : [];
        const selectedId = current ? state.selectedId : null;

        return {
            children: list,
            selectedChild: list.find((child) => child.id === selectedId) ?? null,
            selectedChildId: selectedId,
            status: !isParent ? 'idle' : current ? state.status : 'loading',
            selectChild,
            refreshChildren,
        };
    }, [isParent, userId, state, selectChild, refreshChildren]);

    return <ChildContext.Provider value={value}>{content}</ChildContext.Provider>;
}

export default ChildProvider;
