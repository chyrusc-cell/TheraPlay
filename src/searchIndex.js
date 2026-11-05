// What the global search can find, and how it matches.
// No React in here, so the logic stays small and easy to test.
//
// Every path below is a real route from TheraPlay.jsx. The role rules mirror
// the sidebar and the route guards. They only decide what is SUGGESTED: the
// route guards (RequireRole) and the pages themselves still protect every
// page, even if someone types a URL by hand.

// who can see the suggestion:
//   everyone  any visitor (the page is public)
//   guest     only visitors who are not logged in
//   parent    only verified parent accounts
//   admin     only verified admin accounts
//   signedIn  any verified account (parent or admin)
export const PAGES = [
    { title: 'Activities', path: '/activities', who: 'everyone', aliases: ['activity'] },
    { title: 'Contact Us', path: '/contact', who: 'everyone', aliases: ['contact', 'feedback', 'professionals', 'developer', 'team'] },
    { title: 'Dashboard', path: '/dashboard', who: 'parent', aliases: ['home'] },
    { title: 'My Progress', path: '/progress', who: 'parent', aliases: ['progress', 'streak', 'report'] },
    { title: 'Profile', path: '/profile', who: 'signedIn', aliases: ['account', 'password', 'my profile'] },
    { title: 'Admin Dashboard', path: '/professional-dashboard', who: 'admin', aliases: ['dashboard', 'overview', 'feedback', 'professional dashboard'] },
    { title: 'Manage Activities', path: '/manage-activities', who: 'admin', aliases: ['activities', 'publish', 'materials', 'files'] },
    { title: 'Manage Contacts', path: '/manage-contacts', who: 'admin', aliases: ['contacts', 'professionals'] },
    { title: 'Manage Accounts', path: '/manage-accounts', who: 'admin', aliases: ['accounts', 'users', 'roles'] },
    { title: 'Login', path: '/login', who: 'guest', aliases: ['log in', 'sign in'] },
    { title: 'Register', path: '/register', who: 'guest', aliases: ['sign up', 'create account'] },
];

// Turns the server-verified auth state (see authContext.js) into who is
// searching. While the account is still being verified, or if verification
// failed, only public pages are offered.
export const audienceFor = (status, user) => {
    if (status === 'unauthenticated') {
        return 'guest';
    }

    if (status === 'authenticated') {
        return user?.role === 'admin' ? 'admin' : 'parent';
    }

    return 'unknown';
};

const canSee = (page, audience) => {
    switch (page.who) {
        case 'everyone':
            return true;
        case 'guest':
            return audience === 'guest';
        case 'parent':
            return audience === 'parent';
        case 'admin':
            return audience === 'admin';
        case 'signedIn':
            return audience === 'parent' || audience === 'admin';
        default:
            return false;
    }
};

export const normalize = (text) =>
    String(text ?? '').toLowerCase().trim().replace(/\s+/g, ' ');

// Higher is a better match; 0 means no match. Partial words count, so
// "activ" matches "Activities".
const scoreText = (text, query) => {
    const value = normalize(text);

    if (!value) return 0;
    if (value === query) return 5;
    if (value.startsWith(query)) return 4;
    if (value.split(' ').some((word) => word.startsWith(query))) return 3;
    if (value.includes(query)) return 2;

    return 0;
};

export const searchPages = (rawQuery, audience, limit = 6) => {
    const query = normalize(rawQuery);

    if (!query) {
        return [];
    }

    return PAGES
        .filter((page) => canSee(page, audience))
        .map((page) => {
            const titleScore = scoreText(page.title, query);
            const aliasScore = Math.max(0, ...page.aliases.map((a) => scoreText(a, query)));

            // A title match always ranks above an alias match.
            return { page, score: titleScore ? titleScore + 1 : aliasScore };
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ page }) => ({
            key: `page:${page.path}`,
            kind: 'page',
            label: page.title,
            hint: 'Page',
            path: page.path,
        }));
};

// Activities come from GET /api/activities (public, published only). The detail
// page route is /activities/:activityId, as used by the activities list.
export const searchActivities = (rawQuery, activities, limit = 5) => {
    const query = normalize(rawQuery);

    if (!query || !Array.isArray(activities)) {
        return [];
    }

    return activities
        .map((activity) => {
            const titleScore = scoreText(activity.title, query);
            const descriptionMatch = normalize(activity.description).includes(query);

            return { activity, score: titleScore || (descriptionMatch ? 1 : 0) };
        })
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ activity }) => ({
            key: `activity:${activity.id}`,
            kind: 'activity',
            label: activity.title,
            hint: 'Activity',
            description: activity.description || '',
            path: `/activities/${activity.id}`,
        }));
};
