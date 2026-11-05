import { useRef, useState } from 'react';
import * as auth from './authClasses.js';
import { apiRequest } from './api.js';
import { useAuth } from './authContext.js';
import ChildFormFields from './ChildFormFields.jsx';
import { validateChild } from './childValidation.js';
import OnboardingFrame from './OnboardingFrame.jsx';
import { useDocumentTitle } from './useDocumentTitle.js';

/*
 * Stage 3 of sign-up: the first child profile. Sign-up is only complete once this
 * is saved; a parent who leaves earlier is brought back here at the next login.
 * The child is created only when the form is submitted, for the logged-in parent,
 * and the server refuses it for an unverified email. A repeated submit is ignored
 * here and de-duplicated by the server.
 */
function CreateChild() {
    useDocumentTitle("Your child's profile");

    const { updateUser } = useAuth();
    const [child, setChild] = useState({ name: '', dateOfBirth: '', conditionIds: [] });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const submitting = useRef(false);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (submitting.current) {
            return;
        }

        const problems = validateChild(child);
        setMessage('');

        if (Object.keys(problems).length > 0) {
            setErrors(problems);
            setMessage('Please fix the highlighted fields.');
            return;
        }

        setErrors({});
        submitting.current = true;
        setIsLoading(true);

        try {
            const result = await apiRequest('/children', {
                method: 'POST',
                body: {
                    name: child.name.trim(),
                    date_of_birth: child.dateOfBirth || null,
                    condition_ids: child.conditionIds,
                },
            });

            if (result.ok) {
                // Onboarding is complete: the gate sends the parent to the dashboard.
                updateUser({ onboarding: 'complete' });
                return;
            }

            if (result.status === 403 && result.data.code === 'email_not_verified') {
                updateUser({ email_verified: false, onboarding: 'verify_email' });
                return;
            }

            if (result.status === 422 && result.data.errors) {
                setErrors({
                    name: result.data.errors.name?.[0],
                    date_of_birth: result.data.errors.date_of_birth?.[0],
                    condition_ids: Object.entries(result.data.errors).find(([key]) => key.startsWith('condition_ids'))?.[1]?.[0],
                });
                setMessage('Please fix the highlighted fields.');
            } else {
                setMessage(result.data.message || 'Unable to save the child profile. Please try again.');
            }
        } catch {
            setMessage('Unable to connect to the server. Please try again.');
        } finally {
            submitting.current = false;
            setIsLoading(false);
        }
    };

    return (
        <OnboardingFrame
            current={3}
            title="Your child's profile"
            subtitle="Your email is verified. Tell us about your first child to finish signing up. You can add more children later."
        >
            <form onSubmit={handleSubmit} noValidate>

                <div className="mb-6">
                    <ChildFormFields
                        values={child}
                        onChange={setChild}
                        errors={errors}
                        disabled={isLoading}
                        idPrefix="onboarding-child"
                    />
                </div>

                {message && (
                    <p role="alert" className={auth.registerMessageError}>
                        {message}
                    </p>
                )}

                <button type="submit" className={auth.registerButton} disabled={isLoading}>
                    {isLoading ? 'Saving...' : 'Finish sign-up'}
                </button>

            </form>
        </OnboardingFrame>
    );
}

export default CreateChild;
