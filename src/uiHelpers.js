// Maps a difficulty name from the API to its badge color class (css/ui.css).
// Unknown values fall back to a neutral badge. The word itself is always shown.
export const difficultyBadgeClass = (difficulty) => {
    switch (String(difficulty || '').toLowerCase()) {
        case 'easy':
            return 'ui-badge ui-badge--easy';
        case 'medium':
            return 'ui-badge ui-badge--medium';
        case 'hard':
            return 'ui-badge ui-badge--hard';
        default:
            return 'ui-badge';
    }
};
