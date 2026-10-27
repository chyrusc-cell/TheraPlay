import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './authContext.js';
import {
    apiRequest,
    clearSession,
    mapValidationErrors,
} from './api.js';
import './css/Contact.css';

/*
 * DEVELOPER CONTACT DETAILS: placeholder, please edit.
 * Fill in the values below and they will appear on the page. Leave a value
 * empty ('') to hide that line. No real details have been supplied yet, so
 * nothing is invented here.
 */
const DEVELOPER_CONTACT = {
    name: '',
    role: '',
    email: '',
    phone: '',
};

const hasDeveloperDetails = Object.values(DEVELOPER_CONTACT).some(Boolean);

function Contact() {

    const navigate = useNavigate();
    const { status, user } = useAuth();

    const [contacts, setContacts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    const [message, setMessage] = useState('');
    const [rating, setRating] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [successText, setSuccessText] = useState('');
    const [isSending, setIsSending] = useState(false);


    // Public list: no login needed, so guests can see it too.
    useEffect(() => {
        const controller = new AbortController();

        const loadContacts = async () => {
            try {
                const result = await apiRequest('/contacts', {
                    auth: false,
                    signal: controller.signal,
                });

                if (!result.ok) {
                    throw new Error('Unable to load contacts.');
                }

                setContacts(
                    Array.isArray(result.data.data) ? result.data.data : []
                );
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

        loadContacts();

        return () => controller.abort();
    }, [reloadKey]);


    const retry = () => {
        setIsLoading(true);
        setLoadError('');
        setReloadKey((key) => key + 1);
    };


    const handleSubmit = async (event) => {
        event.preventDefault();

        if (isSending) {
            return;
        }

        const text = message.trim();

        if (!text) {
            setFieldErrors({ message: 'Please write your feedback.' });
            setFormError('');
            setSuccessText('');
            return;
        }

        // No user_id is sent: the server uses the logged-in account.
        const payload = {
            message: text,
            rating: rating ? Number(rating) : null,
        };

        setIsSending(true);
        setFieldErrors({});
        setFormError('');
        setSuccessText('');

        try {
            const result = await apiRequest('/feedback', {
                method: 'POST',
                body: payload,
            });

            if (result.status === 401) {
                clearSession();
                navigate('/login', {
                    state: { message: 'Please log in to send feedback.' },
                });
                return;
            }

            if (result.status === 403) {
                setFormError('Only parent accounts can send feedback.');
                return;
            }

            if (result.status === 422) {
                setFieldErrors(mapValidationErrors(result.data.errors));
                setFormError('Please fix the highlighted fields.');
                return;
            }

            if (!result.ok) {
                throw new Error(
                    result.data.message ||
                    'Unable to send your feedback. Please try again.'
                );
            }

            // Clear the form only after the server confirms it was saved.
            setMessage('');
            setRating('');
            setSuccessText(
                result.data.message || 'Thank you for your feedback.'
            );
        } catch (error) {
            // The message and rating stay so nothing has to be retyped.
            setFormError(
                error.message ||
                'Unable to connect to the server. Please try again.'
            );
        } finally {
            setIsSending(false);
        }
    };


    const renderFeedbackForm = () => {
        if (status === 'loading') {
            return <p className="contact-status">Checking your account...</p>;
        }

        if (status === 'unauthenticated') {
            return (
                <p className="contact-status">
                    Please <Link to="/login">log in</Link> with a parent
                    account to send feedback.
                </p>
            );
        }

        if (status === 'error') {
            return (
                <p className="contact-status contact-error" role="alert">
                    We could not verify your account, so feedback is
                    unavailable right now. Please reload the page.
                </p>
            );
        }

        if (user?.role !== 'parent') {
            return (
                <p className="contact-status">
                    Feedback can only be sent from a parent account.
                </p>
            );
        }

        return (
            <form onSubmit={handleSubmit} noValidate>

                {successText && (
                    <p className="contact-message success" role="status">
                        {successText}
                    </p>
                )}

                {formError && (
                    <p className="contact-message error" role="alert">
                        {formError}
                    </p>
                )}

                <div className="contact-field">

                    <label htmlFor="feedback-message">
                        Your feedback
                    </label>

                    <textarea
                        id="feedback-message"
                        rows={5}
                        placeholder="Tell us what is working well or what we can improve"
                        value={message}
                        maxLength={5000}
                        onChange={(event) => setMessage(event.target.value)}
                        disabled={isSending}
                    />

                    {fieldErrors.message && (
                        <p className="contact-field-error">
                            {fieldErrors.message}
                        </p>
                    )}

                </div>

                <div className="contact-field">

                    <label htmlFor="feedback-rating">
                        Rating (optional)
                    </label>

                    <select
                        id="feedback-rating"
                        value={rating}
                        onChange={(event) => setRating(event.target.value)}
                        disabled={isSending}
                    >

                        <option value="">
                            No rating
                        </option>

                        {[1, 2, 3, 4, 5].map((value) => (
                            <option key={value} value={value}>
                                {value} {value === 1 ? 'star' : 'stars'}
                            </option>
                        ))}

                    </select>

                    {fieldErrors.rating && (
                        <p className="contact-field-error">
                            {fieldErrors.rating}
                        </p>
                    )}

                </div>

                <button
                    type="submit"
                    className="contact-submit"
                    disabled={isSending}
                >
                    {isSending ? 'Sending...' : 'Send Feedback'}
                </button>

            </form>
        );
    };


    return (
        <div className="contact-page">

            <main className="contact-content">

                <div className="contact-header">

                    <h1>
                        Contact Us
                    </h1>

                    <p>
                        Reach out to our professionals, or send us your
                        feedback.
                    </p>

                </div>


                {/* Professional contacts */}

                <section className="contact-section">

                    <h2>
                        Our Professionals
                    </h2>

                    {isLoading ? (

                        <p className="contact-status">
                            Loading contacts...
                        </p>

                    ) : loadError ? (

                        <div className="contact-status contact-error" role="alert">

                            <p>
                                {loadError}
                            </p>

                            <button
                                type="button"
                                className="contact-retry"
                                onClick={retry}
                            >
                                Try again
                            </button>

                        </div>

                    ) : contacts.length === 0 ? (

                        <p className="contact-status">
                            No professional contacts are listed yet.
                        </p>

                    ) : (

                        <div className="contact-grid">

                            {contacts.map((contact) => (

                                <article className="contact-card" key={contact.id}>

                                    <h3>
                                        {contact.name}
                                    </h3>

                                    <p className="contact-title">
                                        {contact.title}
                                    </p>

                                    {contact.description && (
                                        <p className="contact-description">
                                            {contact.description}
                                        </p>
                                    )}

                                    {(contact.email || contact.phone) && (
                                        <ul className="contact-methods">

                                            {contact.email && (
                                                <li>
                                                    <span>Email</span>
                                                    <a href={`mailto:${contact.email}`}>
                                                        {contact.email}
                                                    </a>
                                                </li>
                                            )}

                                            {contact.phone && (
                                                <li>
                                                    <span>Phone</span>
                                                    <a href={`tel:${contact.phone}`}>
                                                        {contact.phone}
                                                    </a>
                                                </li>
                                            )}

                                        </ul>
                                    )}

                                </article>

                            ))}

                        </div>

                    )}

                </section>


                {/* Developer contact (edit DEVELOPER_CONTACT at the top of this file) */}

                <section className="contact-section">

                    <h2>
                        Website Developer
                    </h2>

                    <div className="contact-card">

                        {hasDeveloperDetails ? (
                            <>
                                {DEVELOPER_CONTACT.name && (
                                    <h3>
                                        {DEVELOPER_CONTACT.name}
                                    </h3>
                                )}

                                {DEVELOPER_CONTACT.role && (
                                    <p className="contact-title">
                                        {DEVELOPER_CONTACT.role}
                                    </p>
                                )}

                                {(DEVELOPER_CONTACT.email || DEVELOPER_CONTACT.phone) && (
                                    <ul className="contact-methods">

                                        {DEVELOPER_CONTACT.email && (
                                            <li>
                                                <span>Email</span>
                                                <a href={`mailto:${DEVELOPER_CONTACT.email}`}>
                                                    {DEVELOPER_CONTACT.email}
                                                </a>
                                            </li>
                                        )}

                                        {DEVELOPER_CONTACT.phone && (
                                            <li>
                                                <span>Phone</span>
                                                <a href={`tel:${DEVELOPER_CONTACT.phone}`}>
                                                    {DEVELOPER_CONTACT.phone}
                                                </a>
                                            </li>
                                        )}

                                    </ul>
                                )}
                            </>
                        ) : (
                            <p className="contact-status">
                                Developer contact details will appear here
                                once they are added.
                            </p>
                        )}

                    </div>

                </section>


                {/* Feedback */}

                <section className="contact-section">

                    <h2>
                        Send Feedback
                    </h2>

                    <div className="contact-card">
                        {renderFeedbackForm()}
                    </div>

                </section>

            </main>

        </div>
    );
}

export default Contact;
