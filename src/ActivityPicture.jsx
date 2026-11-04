import { useState } from 'react';

// An activity's picture, or the given fallback (the existing placeholder).
//
// `urls` is a priority list (dedicated picture first, then an attached image).
// The first one that is present and has not failed to load is shown; when every
// one is missing or broken the fallback appears, so there is never a broken-image
// icon. It remembers WHICH urls failed, so a replaced picture is tried again.
// (`url` still works for a single picture.)
function ActivityPicture({ url, urls, alt, className, fallback }) {
    const [failed, setFailed] = useState([]);

    const candidates = (urls ?? [url]).filter(Boolean);
    const current = candidates.find((candidate) => !failed.includes(candidate));

    if (current) {
        return (
            <img
                key={current}
                src={current}
                alt={alt}
                className={className}
                loading="lazy"
                onError={() => setFailed((list) => [...list, current])}
            />
        );
    }

    return fallback;
}

export default ActivityPicture;
