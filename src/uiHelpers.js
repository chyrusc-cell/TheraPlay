// Tailwind badge for a difficulty (used by migrated pages). The colors come
// from the design tokens and give the same contrast as before:
// Easy green, Medium amber, Hard dark red. The word is always shown as well.
// Each variant is written out in full so no two classes set the same property.
const badgeBase = 'inline-block rounded-md px-2.5 py-1 text-xs font-bold leading-[1.3]';

export const difficultyBadgeTw = (difficulty) => {
    switch (String(difficulty || '').toLowerCase()) {
        case 'easy':
            return `${badgeBase} bg-success-bg text-success-text`;
        case 'medium':
            return `${badgeBase} bg-warning-bg text-warning-text`;
        case 'hard':
            return `${badgeBase} bg-hard-bg text-hard-text`;
        default:
            return `${badgeBase} bg-white text-muted`;
    }
};
