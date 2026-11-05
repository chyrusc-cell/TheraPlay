import { useState } from 'react';
import { Star } from 'lucide-react';

/*
 * Five clickable stars for a 1 to 5 rating.
 *
 *  - value is a number: 0 means "no rating yet", otherwise 1 to 5.
 *  - Each star is a real <button>, so Tab, Enter and Space work, and the global
 *    focus ring from ui.css shows.
 *  - Clicking the star that is already selected clears the rating (the rating
 *    is optional), and a "Clear" button does the same for pointer users.
 *  - The chosen value is also written out as text ("3 out of 5"), so the
 *    meaning never depends on color alone.
 */
function StarRating({ value, onChange, disabled = false, label = 'Rating' }) {
    // The star under the mouse, so the stars preview what a click would select.
    const [hovered, setHovered] = useState(0);

    const shown = hovered || value;

    return (
        <div>
            <div
                role="group"
                aria-label={label}
                className="flex items-center gap-1"
                onMouseLeave={() => setHovered(0)}
            >
                {[1, 2, 3, 4, 5].map((star) => {
                    const filled = star <= shown;

                    return (
                        <button
                            key={star}
                            type="button"
                            aria-label={`Rate ${star} out of 5`}
                            aria-pressed={value === star}
                            disabled={disabled}
                            onClick={() => onChange(value === star ? 0 : star)}
                            onMouseEnter={() => setHovered(star)}
                            className={`cursor-pointer rounded-md border-0 bg-transparent p-1 transition-transform duration-150 motion-safe:enabled:hover:scale-110 ${
                                filled ? 'text-[#b26a00]' : 'text-muted'
                            }`}
                        >
                            <Star
                                size={28}
                                aria-hidden="true"
                                fill={filled ? 'currentColor' : 'none'}
                            />
                        </button>
                    );
                })}

                <span
                    className="ml-2 text-[13px] font-medium text-muted"
                    aria-live="polite"
                >
                    {value ? `${value} out of 5` : 'No rating'}
                </span>

                {value > 0 && (
                    <button
                        type="button"
                        onClick={() => onChange(0)}
                        disabled={disabled}
                        className="cursor-pointer rounded-md border-0 bg-transparent px-1.5 py-0.5 text-[12px] font-medium text-muted underline enabled:hover:text-ink"
                    >
                        Clear
                    </button>
                )}
            </div>
        </div>
    );
}

export default StarRating;

/*
 * A read-only row of stars for a saved 1 to 5 rating. The rating is also written as
 * text for screen readers ("Rated 4 out of 5"), so it never depends on color alone.
 */
export function StarDisplay({ value, size = 16 }) {
    const rating = Math.max(0, Math.min(5, Number(value) || 0));

    return (
        <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Rated ${rating} out of 5`}>
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    size={size}
                    aria-hidden="true"
                    className={star <= rating ? 'text-[#b26a00]' : 'text-faint'}
                    fill={star <= rating ? 'currentColor' : 'none'}
                />
            ))}
        </span>
    );
}
