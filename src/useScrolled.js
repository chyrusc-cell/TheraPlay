import { useEffect, useState } from 'react';

// true once the page has scrolled past `threshold` pixels.
//
// It starts from the real scroll position, so reloading halfway down a page does
// not flash the wrong look. The scroll listener is passive and only causes a
// re-render when the answer actually changes (crossing the threshold), not on
// every scroll event.
export default function useScrolled(threshold = 8) {
    const [scrolled, setScrolled] = useState(() => window.scrollY > threshold);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > threshold);

        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => window.removeEventListener('scroll', handleScroll);
    }, [threshold]);

    return scrolled;
}
