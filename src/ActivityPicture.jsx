import { useState } from 'react';

// A generated first-page picture of a PDF attachment (GET .../resources/{id}/thumbnail).
const isPdfThumbnail = (url) => /\/thumbnail$/.test(url);

// An activity's picture, or the given fallback (the existing placeholder).
//
// `urls` is a priority list (dedicated picture first, then the card picture made
// from the attachments: an attached image's original or page 1 of a PDF). The
// first one that is present and has not failed to load is shown; when every one
// is missing or broken the fallback appears, so there is never a broken-image
// icon. It remembers WHICH urls failed, so a replaced picture is tried again.
// (`url` still works for a single picture.)
//
// A PDF page is a tall worksheet: it is cropped from the TOP (pdfClassName, for
// example "object-top") so the title and the start of the worksheet stay readable,
// instead of the default centre crop of the card picture.
function ActivityPicture({ url, urls, alt, className, pdfClassName = 'object-top', fallback }) {
    const [failed, setFailed] = useState([]);

    const candidates = [...new Set((urls ?? [url]).filter(Boolean))];
    const current = candidates.find((candidate) => !failed.includes(candidate));

    if (current) {
        return (
            <img
                key={current}
                src={current}
                alt={alt}
                className={isPdfThumbnail(current) ? `${className} ${pdfClassName}` : className}
                loading="lazy"
                onError={() => setFailed((list) => [...list, current])}
            />
        );
    }

    return fallback;
}

export default ActivityPicture;
