import { useState, useEffect, useId, useLayoutEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Phone, User, Users } from 'lucide-react';
import Collapsible from './Collapsible.jsx';
import Modal from './Modal.jsx';
import DeveloperTeamEditor from './DeveloperTeamEditor.jsx';
import { useAuth } from './authContext.js';
import {
    apiRequest,
    clearSession,
    mapValidationErrors,
} from './api.js';
import { ContactCardsSkeleton } from './Skeleton.jsx';
import { holdSkeleton } from './minLoading.js';
import StarRating from './StarRating.jsx';
import { contactItemClass, contactPanelClass, pageMain, pageHeader, pageTitle, pageSubtitle } from './uiClasses.js';

// The feedback message length limit (the same limit the server enforces).
const MESSAGE_MAX = 5000;

// Class strings reused through the page. The focus ring on fields and buttons is
// the global one from ui.css.
const panelTitleClass = 'mb-4 text-[20px] font-bold text-ink';
const statusClass = 'text-[14px] font-medium text-muted';
const errorClass = 'text-[14px] font-medium text-[#d93025]';
const detailLinkClass =
    'text-[14px] font-medium text-ink underline [overflow-wrap:anywhere]';
const editTeamButtonClass =
    'cursor-pointer rounded-full border border-edge-strong btn-glass px-4 py-1.5 [font-family:inherit] text-[13px] font-bold text-ink enabled:hover:bg-hover';
const toggleClass =
    'mt-2 cursor-pointer border-0 bg-transparent p-0 [font-family:inherit] text-[14px] font-medium text-ink underline underline-offset-4';
const fieldClass = 'mb-[18px] flex flex-col gap-2';
const fieldLabelClass = 'text-[12px] font-medium text-faint';
const fieldErrorClass = 'text-[13px] text-[#d93025]';
const messageBase =
    'mb-4 animate-[ui-fade-in_0.2s_ease-out] text-[14px] font-medium';
const retryClass =
    'mt-3 cursor-pointer rounded-full border border-edge-strong btn-glass px-5 py-2 [font-family:inherit] text-[14px] font-bold text-ink enabled:hover:bg-hover';
const submitClass =
    'cursor-pointer rounded-full border-0 bg-primary px-6 py-2.5 [font-family:inherit] text-[14px] font-bold text-white enabled:hover:bg-primary-hover btn-solid phone:w-full';

// How much of the next contact card peeks out below the second one, so it is
// clear the list scrolls.
const LIST_PEEK = 20;

// A fixed height with resizing turned off: a long message scrolls INSIDE the box
// instead of making the feedback container grow.
const textareaClass =
    'h-40 w-full resize-none overflow-y-auto rounded-xl border border-edge-strong px-3.5 py-3 [font-family:inherit] text-[15px] font-medium text-ink transition-[border-color] focus:border-accent';

/*
 * One contact card: picture on the left, details on the right. Used for the
 * professional contacts and for the developer team. Each card keeps its own
 * expanded state, so opening one never opens the others. The description is
 * hidden until "View More..." is pressed, and the toggle only exists when there
 * is a description.
 */
function ContactCard({ name, title, emails = [], phones = [], description, photoUrl, Fallback = User, note }) {
    const [expanded, setExpanded] = useState(false);
    // Remember WHICH url failed, so a replaced picture is tried again.
    const [failedUrl, setFailedUrl] = useState(null);

    const text = description?.trim() ?? '';
    const hasPhoto = Boolean(photoUrl) && failedUrl !== photoUrl;
    const descriptionId = useId();

    return (
        <article className={`${contactItemClass} flex items-start gap-4 phone:gap-3`}>

            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border border-edge bg-white text-faint phone:h-20 phone:w-20">
                {hasPhoto ? (
                    <img
                        src={photoUrl}
                        alt={`Photo of ${name}`}
                        className="h-full w-full object-cover"
                        onError={() => setFailedUrl(photoUrl)}
                    />
                ) : (
                    <Fallback size={40} aria-hidden="true" />
                )}
            </div>

            <div className="min-w-0 flex-1">

                <h3 className="text-[20px] leading-tight font-bold text-ink [overflow-wrap:anywhere]">
                    {name}
                </h3>

                {title && (
                    <p className="mt-0.5 text-[14px] font-medium text-muted [overflow-wrap:anywhere]">
                        {title}
                    </p>
                )}

                {(emails.length > 0 || phones.length > 0) && (
                    <ul className="mt-2 flex list-none flex-col gap-1.5">

                        {emails.map((email) => (
                            <li className="flex items-start gap-2" key={`email-${email}`}>
                                <Mail size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-faint" />
                                <span className="sr-only">Email: </span>
                                <a href={`mailto:${email}`} className={detailLinkClass}>
                                    {email}
                                </a>
                            </li>
                        ))}

                        {phones.map((phone) => (
                            <li className="flex items-start gap-2" key={`phone-${phone}`}>
                                <Phone size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-faint" />
                                <span className="sr-only">Phone: </span>
                                <a href={`tel:${phone.replace(/\s+/g, '')}`} className={detailLinkClass}>
                                    {phone}
                                </a>
                            </li>
                        ))}

                    </ul>
                )}

                {text && (
                    <div>

                        <Collapsible open={expanded} id={descriptionId}>
                            <p className="pt-2 text-[14px] leading-[1.5] whitespace-pre-wrap text-body [overflow-wrap:anywhere]">
                                {text}
                            </p>
                        </Collapsible>

                        <button
                            type="button"
                            className={toggleClass}
                            onClick={() => setExpanded((previous) => !previous)}
                            aria-expanded={expanded}
                            aria-controls={descriptionId}
                        >
                            {expanded ? 'View Less...' : 'View More...'}
                        </button>

                    </div>
                )}

                {note && (
                    <p className="mt-3 text-[12px] text-faint">
                        {note}
                    </p>
                )}

            </div>

        </article>
    );
}


function Contact() {

    const navigate = useNavigate();
    const { status, user } = useAuth();

    const [contacts, setContacts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    // The Developer Team card comes from the server (edited by admins).
    const [team, setTeam] = useState(null);
    const [teamLoading, setTeamLoading] = useState(true);
    const [teamError, setTeamError] = useState('');
    const [teamReloadKey, setTeamReloadKey] = useState(0);
    const [editingTeam, setEditingTeam] = useState(false);
    const [teamSaving, setTeamSaving] = useState(false);
    const isAdmin = user?.role === 'admin';

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
        const startedAt = performance.now();

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
                await holdSkeleton(startedAt, controller.signal);

                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        loadContacts();

        return () => controller.abort();
    }, [reloadKey]);


    useEffect(() => {
        const controller = new AbortController();

        const loadTeam = async () => {
            try {
                const result = await apiRequest('/developer-team', {
                    auth: false,
                    signal: controller.signal,
                });

                if (!result.ok || !result.data.data) {
                    throw new Error('Unable to load the developer team details.');
                }

                setTeam(result.data.data);
                setTeamError('');
            } catch (error) {
                if (error.name === 'AbortError') {
                    return;
                }

                setTeamError(
                    error.message ||
                    'Unable to connect to the server. Please try again.'
                );
            } finally {
                if (!controller.signal.aborted) {
                    setTeamLoading(false);
                }
            }
        };

        loadTeam();

        return () => controller.abort();
    }, [teamReloadKey]);

    const retryTeam = () => {
        setTeamLoading(true);
        setTeamError('');
        setTeamReloadKey((key) => key + 1);
    };

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

                    <textarea
                        id="feedback-message"
                        aria-label="Your feedback"
                        className={textareaClass}
                        placeholder="Tell us what is working well or what we can improve"
                        value={message}
                        maxLength={MESSAGE_MAX}
                        onChange={(event) => setMessage(event.target.value)}
                        disabled={isSending}
                    />

                    <span className="self-end text-[12px] text-faint">
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
                        We appreciate your rating (optional)
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


    return (
        <div className="min-h-page">

            <div className={pageMain}>

                <div className={pageHeader}>

                    <h1 className={pageTitle}>
                        Contact Us
                    </h1>

                    <p className={pageSubtitle}>
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
                                // The list scrolls, so it clips whatever sticks out of it: the cards'
                                // big soft glass shadow would be cut to a dark rectangle exactly the size
                                // of this box. The cards inside it therefore have no outer shadow.
                                className="flex list-none flex-col gap-3 overflow-y-auto pr-1 [&_article]:shadow-none"
                                aria-label="Professional contacts"
                                tabIndex={0}
                            >

                                {contacts.map((contact) => (

                                    <li key={contact.id}>
                                        <ContactCard
                                            name={contact.name}
                                            title={contact.title}
                                            emails={contact.email ? [contact.email] : []}
                                            phones={contact.phone ? [contact.phone] : []}
                                            description={contact.description}
                                            photoUrl={contact.photo_url}
                                        />
                                    </li>

                                ))}

                            </ul>

                        )}

                    </section>


                    {/* One shared card for the whole development team */}

                    <section className={`${contactPanelClass} min-w-0`}>

                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

                            <h2 className="text-[20px] font-bold text-ink">
                                Development Team
                            </h2>

                            {isAdmin && team && (
                                <button
                                    type="button"
                                    className={editTeamButtonClass}
                                    onClick={() => setEditingTeam(true)}
                                >
                                    Edit Developer Team
                                </button>
                            )}

                        </div>

                        {teamLoading ? (

                            <ContactCardsSkeleton count={1} />

                        ) : teamError ? (

                            <div className={errorClass} role="alert">

                                <p>
                                    {teamError}
                                </p>

                                <button
                                    type="button"
                                    className={retryClass}
                                    onClick={retryTeam}
                                >
                                    Try again
                                </button>

                            </div>

                        ) : (

                            <ContactCard
                                name={team.name}
                                emails={team.emails}
                                phones={team.phones}
                                description={team.description}
                                Fallback={Users}
                                note={
                                    team.is_sample
                                        ? 'Sample details for demonstration only. These are not real or official contact details.'
                                        : undefined
                                }
                            />

                        )}

                    </section>

                </div>


                {/* Feedback: full width underneath */}

                <section className={contactPanelClass}>

                    <h2 className={panelTitleClass}>
                        Send Feedback
                    </h2>

                    {renderFeedbackForm()}

                </section>


                {isAdmin && team && (
                    <Modal
                        open={editingTeam}
                        onClose={() => setEditingTeam(false)}
                        busy={teamSaving}
                        size="md"
                        title="Edit Developer Team"
                    >
                        <DeveloperTeamEditor
                            team={team}
                            onBusyChange={setTeamSaving}
                            onCancel={() => setEditingTeam(false)}
                            onSaved={(saved) => {
                                setTeam(saved);
                                setEditingTeam(false);
                            }}
                            onUnauthorized={() => {
                                clearSession();
                                navigate('/login', {
                                    replace: true,
                                    state: { message: 'Please log in to continue.' },
                                });
                            }}
                        />
                    </Modal>
                )}

            </div>

        </div>
    );
}

export default Contact;
