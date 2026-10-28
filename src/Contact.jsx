import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Phone } from 'lucide-react';
import { useAuth } from './authContext.js';
import {
    apiRequest,
    clearSession,
    mapValidationErrors,
} from './api.js';
import { ContactCardsSkeleton } from './Skeleton.jsx';
import StarRating from './StarRating.jsx';
import { contactItemClass, contactPanelClass } from './uiClasses.js';

/*
 * DEVELOPER TEAM DETAILS.
 * One shared card is shown for the whole team.
 * IMPORTANT: the email and phone below are SAMPLE / DEMO values only. They are
 * not real or official contact details, and the page says so. Replace them (and
 * set isSample to false) once the team has real contact details.
 */
const TEAM = {
    name: 'TheraPlay Development Team',
    description:
        'The team responsible for developing and maintaining the TheraPlay website.',
    email: 'theraplay.team@example.com',
    phone: '+63 900 123 4567',
    isSample: true,
};

// The feedback message length limit (the same limit the server enforces).
const MESSAGE_MAX = 5000;

// Class strings reused through the page. The focus ring on fields and buttons is
// the global one from ui.css.
const panelTitleClass = 'mb-4 text-[20px] font-bold text-ink';
const statusClass = 'text-[14px] font-medium text-muted';
const errorClass = 'text-[14px] font-medium text-[#d93025]';
const nameClass = 'mb-1 text-[16px] font-bold text-ink';
const roleClass = 'text-[14px] font-medium text-muted';
const methodsClass = 'mt-3 flex list-none flex-col gap-2';
const methodClass = 'flex flex-col gap-0.5';
const methodLabelClass = 'text-[12px] font-medium text-[#888]';
const methodLinkClass = 'text-[14px] font-bold text-ink [word-break:break-word]';
const fieldClass = 'mb-[18px] flex flex-col gap-2';
const fieldLabelClass = 'text-[12px] font-medium text-[#888]';
const fieldErrorClass = 'text-[13px] text-[#d93025]';
const messageBase = 'mb-4 text-[14px] font-medium';
const retryClass =
    'mt-3 cursor-pointer rounded-3xl border border-[#333] bg-white px-5 py-2 [font-family:inherit] text-[14px] font-bold text-[#333] enabled:hover:bg-hover';
const submitClass =
    'cursor-pointer rounded-3xl border-0 bg-primary px-6 py-2.5 [font-family:inherit] text-[14px] font-bold text-white enabled:hover:bg-primary-hover phone:w-full';

// How much of the next contact card peeks out below the second one, so it is
// clear the list scrolls.
const LIST_PEEK = 20;

// A fixed height with resizing turned off: a long message scrolls INSIDE the box
// instead of making the feedback container grow.
const textareaClass =
    'h-40 w-full resize-none overflow-y-auto rounded-lg border border-[#ddd] px-3.5 py-3 [font-family:inherit] text-[15px] font-medium text-ink transition-[border-color] focus:border-[#333]';

function Contact() {

    const navigate = useNavigate();
    const { status, user } = useAuth();

    const [contacts, setContacts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    const [message, setMessage] = useState('');
    // 0 = no rating chosen, otherwise 1 to 5.
    const [rating, setRating] = useState(0);
    const [fieldErrors, setFieldErrors] = useState({});
    const [formError, setFormError] = useState('');
    const [successText, setSuccessText] = useState('');
    const [isSending, setIsSending] = useState(false);

    // The contact list shows about two cards: its height is measured from the
    // real rendered cards (null = no limit, e.g. two or fewer contacts).
    const listRef = useRef(null);
    const [listMaxHeight, setListMaxHeight] = useState(null);


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

        // No user_id is sent: the server uses the logged-in account. The rating
        // is the same optional number (1 to 5, or null) the server expects.
        const payload = {
            message: text,
            rating: rating || null,
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
            setRating(0);
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
            return <p className={statusClass}>Checking your account...</p>;
        }

        if (status === 'unauthenticated') {
            return (
                <p className={statusClass}>
                    Please <Link to="/login" className="font-bold text-ink">log in</Link> with a parent
                    account to send feedback.
                </p>
            );
        }

        if (status === 'error') {
            return (
                <p className={errorClass} role="alert">
                    We could not verify your account, so feedback is
                    unavailable right now. Please reload the page.
                </p>
            );
        }

        if (user?.role !== 'parent') {
            return (
                <p className={statusClass}>
                    Feedback can only be sent from a parent account.
                </p>
            );
        }

        return (
            <form onSubmit={handleSubmit} noValidate>

                {successText && (
                    <p className={`${messageBase} text-[#188038]`} role="status">
                        {successText}
                    </p>
                )}

                {formError && (
                    <p className={`${messageBase} text-[#d93025]`} role="alert">
                        {formError}
                    </p>
                )}

                <div className={fieldClass}>

                    <label htmlFor="feedback-message" className={fieldLabelClass}>
                        Your feedback
                    </label>

                    <textarea
                        id="feedback-message"
                        className={textareaClass}
                        placeholder="Tell us what is working well or what we can improve"
                        value={message}
                        maxLength={MESSAGE_MAX}
                        onChange={(event) => setMessage(event.target.value)}
                        disabled={isSending}
                    />

                    <span className="self-end text-[12px] text-[#888]">
                        {message.length} / {MESSAGE_MAX}
                    </span>

                    {fieldErrors.message && (
                        <p className={fieldErrorClass}>
                            {fieldErrors.message}
                        </p>
                    )}

                </div>

                <div className={fieldClass}>

                    <span className={fieldLabelClass}>
                        Rating (optional)
                    </span>

                    <StarRating
                        value={rating}
                        onChange={setRating}
                        disabled={isSending}
                        label="Rating (optional)"
                    />

                    {fieldErrors.rating && (
                        <p className={fieldErrorClass}>
                            {fieldErrors.rating}
                        </p>
                    )}

                </div>

                <button
                    type="submit"
                    className={submitClass}
                    disabled={isSending}
                >
                    {isSending ? 'Sending...' : 'Send Feedback'}
                </button>

            </form>
        );
    };


    // Size the list from the first two rendered cards plus the gap between them
    // and a small peek of the third. Re-measured whenever the cards resize (for
    // example when text wraps on a narrower screen).
    useLayoutEffect(() => {
        const list = listRef.current;

        if (!list) {
            return undefined;
        }

        const measure = () => {
            const cards = list.children;

            if (cards.length <= 2) {
                setListMaxHeight(null);
                return;
            }

            const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
            const first = cards[0].getBoundingClientRect().height;
            const second = cards[1].getBoundingClientRect().height;

            setListMaxHeight(Math.ceil(first + gap + second + LIST_PEEK));
        };

        const observer = new ResizeObserver(measure);

        observer.observe(list);
        Array.from(list.children).forEach((card) => observer.observe(card));

        return () => observer.disconnect();
    }, [contacts, isLoading, loadError]);


    // Email and phone lines, shown only for the values that exist.
    const renderMethods = ({ email, phone }) =>
        (email || phone) && (
            <ul className={methodsClass}>

                {email && (
                    <li className={methodClass}>
                        <span className={methodLabelClass}>Email</span>
                        <a href={`mailto:${email}`} className={methodLinkClass}>
                            {email}
                        </a>
                    </li>
                )}

                {phone && (
                    <li className={methodClass}>
                        <span className={methodLabelClass}>Phone</span>
                        <a href={`tel:${phone}`} className={methodLinkClass}>
                            {phone}
                        </a>
                    </li>
                )}

            </ul>
        );


    return (
        <div className="min-h-page">

            <main className="mx-auto w-full max-w-[1100px] px-5 pt-[30px] pb-20 phone:px-4 phone:pt-5 phone:pb-[60px]">

                <div className="mb-[30px]">

                    <h1 className="mb-1.5 text-[36px] font-bold text-ink">
                        Contact Us
                    </h1>

                    <p className="text-[15px] text-muted">
                        Reach out to our professionals, or send us your
                        feedback.
                    </p>

                </div>


                {/* Top row: two containers of equal height (the grid stretches them),
                    stacked on small screens */}

                <div className="mb-6 grid grid-cols-2 gap-6 tablet-sm:grid-cols-1">

                    {/* Professional contacts (the list scrolls inside its box) */}

                    <section className={`${contactPanelClass} min-w-0`}>

                        <h2 className={panelTitleClass}>
                            Professional Contacts
                        </h2>

                        {isLoading ? (

                            <ContactCardsSkeleton count={2} />

                        ) : loadError ? (

                            <div className={errorClass} role="alert">

                                <p>
                                    {loadError}
                                </p>

                                <button
                                    type="button"
                                    className={retryClass}
                                    onClick={retry}
                                >
                                    Try again
                                </button>

                            </div>

                        ) : contacts.length === 0 ? (

                            <p className={statusClass}>
                                No professional contacts are listed yet.
                            </p>

                        ) : (

                            <ul
                                ref={listRef}
                                style={listMaxHeight ? { maxHeight: listMaxHeight } : undefined}
                                className="flex list-none flex-col gap-3 overflow-y-auto pr-1"
                                aria-label="Professional contacts"
                                tabIndex={0}
                            >

                                {contacts.map((contact) => (

                                    <li className={contactItemClass} key={contact.id}>

                                        <h3 className={nameClass}>
                                            {contact.name}
                                        </h3>

                                        <p className={roleClass}>
                                            {contact.title}
                                        </p>

                                        {contact.description && (
                                            <p className="mt-2 text-[14px] leading-[1.5] text-[#555]">
                                                {contact.description}
                                            </p>
                                        )}

                                        {renderMethods(contact)}

                                    </li>

                                ))}

                            </ul>

                        )}

                    </section>


                    {/* One shared card for the whole development team */}

                    <section className={`${contactPanelClass} min-w-0`}>

                        <h2 className={panelTitleClass}>
                            Developer Team
                        </h2>

                        <div className={contactItemClass}>

                            <h3 className={nameClass}>
                                {TEAM.name}
                            </h3>

                            <p className="text-[14px] leading-[1.5] text-[#555]">
                                {TEAM.description}
                            </p>

                            <ul className={methodsClass}>

                                <li className="flex items-center gap-2">
                                    <Mail size={16} aria-hidden="true" className="shrink-0 text-[#888]" />
                                    <span className="sr-only">Email: </span>
                                    <a href={`mailto:${TEAM.email}`} className={methodLinkClass}>
                                        {TEAM.email}
                                    </a>
                                </li>

                                <li className="flex items-center gap-2">
                                    <Phone size={16} aria-hidden="true" className="shrink-0 text-[#888]" />
                                    <span className="sr-only">Phone: </span>
                                    <a href={`tel:${TEAM.phone.replace(/\s+/g, '')}`} className={methodLinkClass}>
                                        {TEAM.phone}
                                    </a>
                                </li>

                            </ul>

                            {TEAM.isSample && (
                                <p className="mt-3 text-[12px] text-[#888]">
                                    Sample details for demonstration only. These are not real or official contact details.
                                </p>
                            )}

                        </div>

                    </section>

                </div>


                {/* Feedback: full width underneath */}

                <section className={contactPanelClass}>

                    <h2 className={panelTitleClass}>
                        Send Feedback
                    </h2>

                    {renderFeedbackForm()}

                </section>

            </main>

        </div>
    );
}

export default Contact;
