import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { useAuth } from './authContext.js';
import { getToken } from './api.js';

// The profile picture is private (only its owner can read it), so an <img> can't
// request it directly: it is downloaded with the login token and shown through a
// temporary blob URL, which is released when the picture changes or the
// component goes away. Returns null while loading, when there is no picture, and
// when the download fails.
function useProtectedImage(url) {
    const [loaded, setLoaded] = useState({ url: null, src: null });

    useEffect(() => {
        const token = getToken();

        if (!url || !token) {
            return undefined;
        }

        const controller = new AbortController();
        let objectUrl = null;

        fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
        })
            .then((response) => (response.ok ? response.blob() : null))
            .then((blob) => {
                if (blob && !controller.signal.aborted) {
                    objectUrl = URL.createObjectURL(blob);
                    setLoaded({ url, src: objectUrl });
                }
            })
            .catch(() => {});

        return () => {
            controller.abort();

            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [url]);

    return url && loaded.url === url ? loaded.src : null;
}

/*
 * A round profile picture that fills its parent (the parent sets the size and
 * clips it). Shows previewSrc (a picture chosen but not saved yet) first, then
 * the saved picture, then a default avatar when there is none or it can't load.
 */
export function ProfileAvatar({ photoUrl, previewSrc, iconSize = 18 }) {
    const savedSrc = useProtectedImage(photoUrl);
    const [brokenSrc, setBrokenSrc] = useState(null);
    const src = previewSrc || savedSrc;

    if (src && brokenSrc !== src) {
        return (
            <img
                src={src}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setBrokenSrc(src)}
            />
        );
    }

    return (
        <span className="flex h-full w-full items-center justify-center">
            <User size={iconSize} aria-hidden="true" />
        </span>
    );
}

// The signed-in user's own picture (for the shared top-right shortcut).
export function CurrentUserAvatar() {
    const { user } = useAuth();

    return <ProfileAvatar photoUrl={user?.photo_url} />;
}
