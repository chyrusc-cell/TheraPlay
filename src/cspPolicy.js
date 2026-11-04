// The Content Security Policy for the PRODUCTION build (vite.config.js puts it
// into index.html as a <meta> tag; the dev server is left alone because Vite's
// hot reload needs inline scripts). It limits where the app may load code, data
// and frames from, which also limits what an injected script could reach with the
// login token kept in browser storage.
//
// Why each source is there:
//  - script-src 'self': only the built bundle; no inline scripts, no eval.
//  - style-src 'unsafe-inline': React sets inline style attributes (progress bars)
//    and Google Fonts' stylesheet is imported in tailwind.css.
//  - img-src: the API serves activity/contact/profile pictures; blob: and data:
//    for attachment previews and inline icons.
//  - connect-src: the API, and nothing else.
//  - frame-src / object-src blob:: the PDF preview shows a blob: URL in a frame.
//  - object-src 'self' blob: (not 'none'): Chrome's PDF viewer is a plugin and is
//    blocked by 'none'.
// A <meta> policy cannot set frame-ancestors; send that (and the same policy) as
// a real response header from the web server in deployment.

export function buildCsp(apiUrl) {
    const apiOrigin = new URL(apiUrl).origin;

    const directives = {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'blob:', apiOrigin],
        'connect-src': ["'self'", apiOrigin],
        'frame-src': ['blob:'],
        'object-src': ["'self'", 'blob:'],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
    };

    return Object.entries(directives)
        .map(([name, sources]) => `${name} ${sources.join(' ')}`)
        .join('; ');
}
