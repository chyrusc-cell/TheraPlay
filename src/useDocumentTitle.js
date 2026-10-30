import { useEffect } from 'react';

// Sets the browser tab title for the page ("Page - TheraPlay") and puts the
// previous one back when the page unmounts.
export function useDocumentTitle(title) {
    useEffect(() => {
        const previous = document.title;
        document.title = title ? `${title} - TheraPlay` : 'TheraPlay';

        return () => {
            document.title = previous;
        };
    }, [title]);
}
