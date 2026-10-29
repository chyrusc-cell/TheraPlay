import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, clearSession, mapValidationErrors } from './api.js';
import * as ui from './adminClasses.js';

/*
 * Admin editor for the Developer Team card shown on the Contact Us page. It is
 * one settings record, kept separate from the professional contacts above.
 * Until it is saved for the first time, the page shows built-in SAMPLE details
 * (the server says so with is_sample).
 */
function DeveloperTeamAdmin() {
    const navigate = useNavigate();

    const [form, setForm] = useState({ name: '', description: '', email: '', phone: '' });
    const [isSample, setIsSample] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    const [isSaving, setIsSaving] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [notice, setNotice] = useState(null);

    const toForm = (data) => ({
        name: data.name || '',
        description: data.description || '',
        email: data.email || '',
        phone: data.phone || '',
    });

    const handleUnauthorized = () => {
        clearSession();
        navigate('/login', {
            replace: true,
            state: { message: 'Please log in to continue.' },
        });
    };

    useEffect(() => {
        const controller = new AbortController();

        const load = async () => {
            try {
                const result = await apiRequest('/admin/developer-team', {
                    signal: controller.signal,
                });

                if (result.status === 401) {
                    handleUnauthorized();
                    return;
                }

                if (!result.ok) {
                    throw new Error('Unable to load the developer team details.');
                }

                setForm(toForm(result.data.data));
                setIsSample(Boolean(result.data.data.is_sample));
                setLoadError('');
            } catch (error) {
                if (error.name === 'AbortError') {
                    return;
                }

                setLoadError(
                    error.message ||
                    'Unable to connect to the server. Please try again.'
                );
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        load();

        return () => controller.abort();
        // handleUnauthorized only uses navigate, which does not change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reloadKey]);

    const updateField = (name, value) => {
        setForm((current) => ({ ...current, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (isSaving) {
            return;
        }

        setIsSaving(true);
        setFieldErrors({});
        setNotice(null);

        try {
            const result = await apiRequest('/admin/developer-team', {
                method: 'PUT',
                body: {
                    name: form.name.trim(),
                    description: form.description.trim() || null,
                    email: form.email.trim() || null,
                    phone: form.phone.trim() || null,
                },
            });

            if (result.status === 401) {
                handleUnauthorized();
                return;
            }

            if (result.status === 422) {
                setFieldErrors(mapValidationErrors(result.data.errors));
                setNotice({ type: 'error', text: 'Please fix the highlighted fields.' });
                return;
            }

            if (!result.ok) {
                throw new Error(
                    result.data.message ||
                    'Unable to save the developer team details. Please try again.'
                );
            }

            setForm(toForm(result.data.data));
            setIsSample(false);
            setNotice({ type: 'success', text: 'Developer team details saved.' });
        } catch (error) {
            // The typed values stay in the form so they can be corrected.
            setNotice({
                type: 'error',
                text: error.message || 'Unable to connect to the server. Please try again.',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className={ui.formCard} aria-labelledby="developer-team-title">

            <h2 className={ui.formTitle} id="developer-team-title">
                Developer Team Card
            </h2>

            <p className={ui.fileHint}>
                This is the Developer Team card on the Contact Us page.
                {isSample
                    ? ' It is currently showing built-in SAMPLE details (the page labels them as sample). Saving replaces them.'
                    : ''}
            </p>

            {isLoading ? (

                <p className={ui.fileHint} role="status">Loading...</p>

            ) : loadError ? (

                <div className={ui.listError} role="alert">
                    <p>{loadError}</p>
                    <button
                        type="button"
                        className={ui.saveButton}
                        onClick={() => {
                            setIsLoading(true);
                            setLoadError('');
                            setReloadKey((key) => key + 1);
                        }}
                    >
                        Try again
                    </button>
                </div>

            ) : (

                <form onSubmit={handleSubmit}>

                    {notice && (
                        <p
                            className={notice.type === 'error' ? ui.messageError : ui.messageSuccess}
                            role={notice.type === 'error' ? 'alert' : 'status'}
                        >
                            {notice.text}
                        </p>
                    )}

                    <div className={ui.formGroup}>
                        <label className={ui.label} htmlFor="team-name">Team name</label>
                        <input
                            className={ui.input}
                            id="team-name"
                            type="text"
                            value={form.name}
                            maxLength={255}
                            onChange={(event) => updateField('name', event.target.value)}
                            required
                        />
                        {fieldErrors.name && <p className={ui.fieldError}>{fieldErrors.name}</p>}
                    </div>

                    <div className={ui.formGroup}>
                        <label className={ui.label} htmlFor="team-description">Description (optional)</label>
                        <textarea
                            className={`${ui.activityTextarea} h-20`}
                            id="team-description"
                            value={form.description}
                            maxLength={2000}
                            onChange={(event) => updateField('description', event.target.value)}
                        />
                        {fieldErrors.description && <p className={ui.fieldError}>{fieldErrors.description}</p>}
                    </div>

                    <div className={ui.activityPairRow}>

                        <div className={ui.formGroup}>
                            <label className={ui.label} htmlFor="team-email">Email (optional)</label>
                            <input
                                className={ui.input}
                                id="team-email"
                                type="email"
                                value={form.email}
                                maxLength={255}
                                onChange={(event) => updateField('email', event.target.value)}
                            />
                            {fieldErrors.email && <p className={ui.fieldError}>{fieldErrors.email}</p>}
                        </div>

                        <div className={ui.formGroup}>
                            <label className={ui.label} htmlFor="team-phone">Phone (optional)</label>
                            <input
                                className={ui.input}
                                id="team-phone"
                                type="tel"
                                value={form.phone}
                                maxLength={30}
                                onChange={(event) => updateField('phone', event.target.value)}
                            />
                            {fieldErrors.phone && <p className={ui.fieldError}>{fieldErrors.phone}</p>}
                        </div>

                    </div>

                    <div className={ui.activityFormActions}>
                        <button type="submit" className={ui.saveButton} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Team Details'}
                        </button>
                    </div>

                </form>

            )}

        </section>
    );
}

export default DeveloperTeamAdmin;
