// Keeps a loading skeleton on screen for at least MIN_SKELETON_MS, so a fast
// response does not make it flash.
//
// The request itself is never delayed: the caller records performance.now()
// when the load starts, fires the request straight away, and awaits this in its
// `finally`. It resolves right away when the request already took long enough,
// otherwise after the time that is left. If the load's AbortSignal fires first
// (unmount, a newer load, a retry) the timer is cleared and it resolves at once,
// so no timer outlives the component and a stale load can never end a newer
// loading state (callers check `signal.aborted` afterwards).
export const MIN_SKELETON_MS = 500;

export function holdSkeleton(startedAt, signal, minimum = MIN_SKELETON_MS) {
    const remaining = minimum - (performance.now() - startedAt);

    if (remaining <= 0 || signal.aborted) {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        const finish = () => {
            clearTimeout(timer);
            signal.removeEventListener('abort', finish);
            resolve();
        };

        const timer = setTimeout(finish, remaining);

        signal.addEventListener('abort', finish, { once: true });
    });
}
