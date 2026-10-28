import { useState } from 'react';

// An activity's real picture, or the given fallback (the existing placeholder)
// when there is no picture or it fails to load. Remembers WHICH url failed, so
// a replaced picture is tried again.
function ActivityPicture({ url, alt, className, fallback }) {
    const [failedUrl, setFailedUrl] = useState(null);

    if (url && failedUrl !== url) {
        return (
            <img
                src={url}
                alt={alt}
                className={className}
                loading="lazy"
                onError={() => setFailedUrl(url)}
            />
        );
    }

    return fallback;
}

export default ActivityPicture;
