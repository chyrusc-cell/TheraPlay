import { useEffect, useState } from 'react';
import { apiRequest } from './api.js';

// The conditions a parent can choose from (admin-managed, active ones; the list
// is public). Returns { conditions, status: 'loading' | 'ready' | 'error' }.
export default function useConditions() {
    const [state, setState] = useState({ conditions: [], status: 'loading' });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        const load = async () => {
            try {
                const result = await apiRequest('/conditions', {
                    auth: false,
                    signal: controller.signal,
                });

                if (!result.ok) {
                    throw new Error('Unable to load the conditions.');
                }

                setState({
                    conditions: Array.isArray(result.data.data) ? result.data.data : [],
                    status: 'ready',
                });
            } catch (error) {
                if (error.name !== 'AbortError') {
                    setState({ conditions: [], status: 'error' });
                }
            }
        };

        load();

        return () => controller.abort();
    }, [attempt]);

    return {
        ...state,
        retry: () => {
            setState({ conditions: [], status: 'loading' });
            setAttempt((n) => n + 1);
        },
    };
}
