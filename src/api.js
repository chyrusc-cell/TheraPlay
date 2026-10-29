// Small shared helpers for talking to the Laravel API.
// Authentication is the same as everywhere else: Login.jsx saves the Sanctum
// token in localStorage or sessionStorage and it is sent as a Bearer token.

export const API_URL = 'http://127.0.0.1:8000/api';

export const getToken = () =>
    localStorage.getItem('theraplay_token') ||
    sessionStorage.getItem('theraplay_token');

// Removes the saved login (used when the token is missing or rejected).
export const clearSession = () => {
    ['theraplay_token', 'theraplay_user'].forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });

    // The remembered child choice goes too, so it cannot carry over to the next
    // login on this browser.
    Object.keys(localStorage)
        .filter((key) => key.startsWith('theraplay_selected_child:'))
        .forEach((key) => localStorage.removeItem(key));
};

// Sends a request and resolves with { ok, status, data }.
// Network failures throw. Pass auth: false for public endpoints.
export const apiRequest = async (
    path,
    { method = 'GET', body, signal, auth = true } = {}
) => {
    const headers = { Accept: 'application/json' };

    if (auth) {
        const token = getToken();

        if (!token) {
            return { ok: false, status: 401, data: {} };
        }

        headers.Authorization = `Bearer ${token}`;
    }

    // FormData (file uploads) is sent as is. The browser then adds the
    // multipart Content-Type together with its boundary, so it must NOT be
    // set here. Anything else is sent as JSON.
    const isFormData = body instanceof FormData;

    if (body && !isFormData) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
        signal,
    });

    const data = await response.json().catch(() => ({}));

    return { ok: response.ok, status: response.status, data };
};

// Laravel sends { errors: { field: ['message', ...] } } for 422 responses.
// Keeps the first message for each field.
export const mapValidationErrors = (errors = {}) => {
    const result = {};

    Object.entries(errors).forEach(([key, messages]) => {
        const field = key.split('.')[0];

        if (!result[field]) {
            result[field] = Array.isArray(messages) ? messages[0] : messages;
        }
    });

    return result;
};
