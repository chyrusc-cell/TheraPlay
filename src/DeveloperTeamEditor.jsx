import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { apiRequest, mapValidationErrors } from './api.js';
import * as ui from './adminClasses.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+().\-\s]+$/;
const MAX_ENTRIES = 10;

const addButtonClass =
    'inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-edge-strong btn-glass px-3 py-1.5 [font-family:inherit] text-[13px] font-bold text-ink enabled:hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60';
const removeButtonClass =
    'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-edge-strong btn-glass text-muted enabled:hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60';

// A list always shows at least one (possibly empty) row.
const toRows = (values) => (values && values.length > 0 ? [...values] : ['']);

/*
 * The Developer Team editor (it opens in a modal on the Contact Us page, for
 * admins only; the server checks the role again). It edits the name,
 * description and any number of emails and phone numbers.
 *  - A single blank row means "none". A blank row among several is an error.
 *  - Quick checks happen here; Laravel repeats all of them and decides.
 *  - On a failed save, everything typed stays in the form.
 */
function DeveloperTeamEditor({ team, onSaved, onCancel, onBusyChange, onUnauthorized }) {
    const [name, setName] = useState(team.name || '');
    const [description, setDescription] = useState(team.description || '');
    const [emails, setEmails] = useState(toRows(team.emails));
    const [phones, setPhones] = useState(toRows(team.phones));

    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState('');

    const setBusy = (value) => {
        setIsSaving(value);
        onBusyChange?.(value);
    };

    const updateRow = (setter, index, value) =>
        setter((rows) => rows.map((row, i) => (i === index ? value : row)));

    const removeRow = (setter, index) =>
        setter((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : ['']));

    // Returns the cleaned list, or null (and records the error) when invalid.
    const check = (rows, key, label, pattern) => {
        const trimmed = rows.map((row) => row.trim());

        // One blank row = nothing entered.
        if (trimmed.length === 1 && trimmed[0] === '') {
            return [];
        }

        if (trimmed.some((row) => row === '')) {
            return { error: `Fill in or remove the empty ${label}.` };
        }

        if (trimmed.some((row) => !pattern.test(row))) {
            return { error: `Enter a valid ${label}.` };
        }

        if (new Set(trimmed.map((row) => row.toLowerCase())).size !== trimmed.length) {
            return { error: `Each ${label} can only be listed once.` };
        }

        return trimmed;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (isSaving) {
            return;
        }

        const nextErrors = {};
        const cleanEmails = check(emails, 'emails', 'email address', EMAIL_PATTERN);
        const cleanPhones = check(phones, 'phones', 'phone number', PHONE_PATTERN);

        if (!name.trim()) {
            nextErrors.name = 'Enter the team name.';
        }

        if (!Array.isArray(cleanEmails)) {
            nextErrors.emails = cleanEmails.error;
        }

        if (!Array.isArray(cleanPhones)) {
            nextErrors.phones = cleanPhones.error;
        }

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors);
            setFormError('Please fix the highlighted fields.');
            return;
        }

        setBusy(true);
        setErrors({});
        setFormError('');

        try {
            const result = await apiRequest('/admin/developer-team', {
                method: 'PUT',
                body: {
                    name: name.trim(),
                    description: description.trim() || null,
                    emails: cleanEmails,
                    phones: cleanPhones,
                },
            });

            if (result.status === 401) {
                onUnauthorized?.();
                return;
            }

            if (result.status === 422) {
                setErrors(mapValidationErrors(result.data.errors));
                setFormError('Please fix the highlighted fields.');
                return;
            }

            if (!result.ok) {
                throw new Error(
                    result.status === 403
                        ? 'You do not have permission to edit this.'
                        : result.data.message ||
                          'Unable to save the developer team details. Please try again.'
                );
            }

            onSaved(result.data.data);
        } catch (error) {
            setFormError(
                error.message || 'Unable to connect to the server. Please try again.'
            );
        } finally {
            setBusy(false);
        }
    };

    const renderList = ({ id, label, type, placeholder, rows, setter, errorKey, addLabel, inputMode }) => (
        <div className={ui.formGroup}>

            <span className={ui.label} id={`${id}-label`}>{label}</span>

            <ul className="flex list-none flex-col gap-2" aria-labelledby={`${id}-label`}>
                {rows.map((value, index) => (
                    <li className="flex items-center gap-2" key={index}>
                        <input
                            className={`${ui.input} min-w-0 flex-1`}
                            id={`${id}-${index}`}
                            type={type}
                            inputMode={inputMode}
                            placeholder={placeholder}
                            aria-label={`${label} ${index + 1}`}
                            value={value}
                            maxLength={type === 'email' ? 255 : 30}
                            onChange={(event) => updateRow(setter, index, event.target.value)}
                            disabled={isSaving}
                        />
                        {(rows.length > 1 || value !== '') && (
                            <button
                                type="button"
                                className={removeButtonClass}
                                onClick={() => removeRow(setter, index)}
                                disabled={isSaving}
                                aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
                            >
                                <Trash2 size={16} aria-hidden="true" />
                            </button>
                        )}
                    </li>
                ))}
            </ul>

            <div className="mt-2">
                <button
                    type="button"
                    className={addButtonClass}
                    onClick={() => setter((current) => [...current, ''])}
                    disabled={isSaving || rows.length >= MAX_ENTRIES}
                >
                    <Plus size={14} aria-hidden="true" />
                    {addLabel}
                </button>
            </div>

            {errors[errorKey] && (
                <p className={ui.fieldError} role="alert">{errors[errorKey]}</p>
            )}

        </div>
    );

    return (
        <form onSubmit={handleSubmit} noValidate>

            {team.is_sample && (
                <p className={ui.fileHint}>
                    These are the built-in SAMPLE details (the Contact Us page labels them as
                    sample). Saving replaces them.
                </p>
            )}

            {formError && (
                <p className={ui.messageError} role="alert">{formError}</p>
            )}

            <div className={ui.formGroup}>
                <label className={ui.label} htmlFor="team-name">Team name</label>
                <input
                    className={ui.input}
                    id="team-name"
                    type="text"
                    value={name}
                    maxLength={255}
                    onChange={(event) => setName(event.target.value)}
                    disabled={isSaving}
                    required
                />
                {errors.name && <p className={ui.fieldError}>{errors.name}</p>}
            </div>

            <div className={ui.formGroup}>
                <label className={ui.label} htmlFor="team-description">Description (optional)</label>
                <textarea
                    className={`${ui.activityTextarea} h-20`}
                    id="team-description"
                    value={description}
                    maxLength={2000}
                    onChange={(event) => setDescription(event.target.value)}
                    disabled={isSaving}
                />
                {errors.description && <p className={ui.fieldError}>{errors.description}</p>}
            </div>

            {renderList({
                id: 'team-email',
                label: 'Email addresses',
                type: 'email',
                placeholder: 'name@example.com',
                rows: emails,
                setter: setEmails,
                errorKey: 'emails',
                addLabel: 'Add another email',
            })}

            {renderList({
                id: 'team-phone',
                label: 'Phone numbers',
                type: 'tel',
                inputMode: 'tel',
                placeholder: '+63 917 123 4567',
                rows: phones,
                setter: setPhones,
                errorKey: 'phones',
                addLabel: 'Add another phone number',
            })}

            <div className={ui.activityFormActions}>
                <button
                    type="button"
                    className={ui.cancelButton}
                    onClick={onCancel}
                    disabled={isSaving}
                >
                    Cancel
                </button>
                <button type="submit" className={ui.saveButton} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

        </form>
    );
}

export default DeveloperTeamEditor;
