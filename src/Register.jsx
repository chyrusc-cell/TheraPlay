import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as auth from './authClasses.js';
import { logo } from './brand.js';
import ChildFormFields from './ChildFormFields.jsx';
import { validateChild } from './childValidation.js';
import { API_URL } from './api.js';

function Register() {
    const navigate = useNavigate();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Step 1 = the parent account, step 2 = the first child. Everything typed is
    // kept when going back and forth; nothing is sent until the last step.
    const [step, setStep] = useState(1);
    const [child, setChild] = useState({ name: '', dateOfBirth: '', conditionIds: [] });
    const [childErrors, setChildErrors] = useState({});

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = async (event) => {
        event.preventDefault();

        setMessage('');
        setIsError(false);

        if (password !== confirmPassword) {
            setMessage('Passwords do not match.');
            setIsError(true);
            return;
        }

        // Step 1 only moves on; the account is created after the child step.
        if (step === 1) {
            setStep(2);
            return;
        }

        const problems = validateChild(child);

        if (Object.keys(problems).length > 0) {
            setChildErrors(problems);
            setMessage('Please fix the highlighted fields.');
            setIsError(true);
            return;
        }

        setChildErrors({});
        setIsLoading(true);

        try {
            const response = await fetch(
                `${API_URL}/register`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    body: JSON.stringify({
                        first_name: firstName.trim(),
                        last_name: lastName.trim(),
                        email: email.trim(),
                        phone: phone.trim(),
                        password,
                        password_confirmation: confirmPassword,
                        child: {
                            name: child.name.trim(),
                            date_of_birth: child.dateOfBirth || null,
                            condition_ids: child.conditionIds,
                        },
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                // Show a child problem on the child step, an account problem (for
                // example an email already in use) on the first step.
                const keys = Object.keys(data.errors || {});

                if (keys.some((key) => key.startsWith('child.'))) {
                    setChildErrors({
                        name: data.errors['child.name']?.[0],
                        date_of_birth: data.errors['child.date_of_birth']?.[0],
                        condition_ids: data.errors[keys.find((key) => key.startsWith('child.condition_ids'))]?.[0],
                    });
                } else if (keys.length > 0) {
                    setStep(1);
                }

                const validationErrors = data.errors
                    ? Object.values(data.errors).flat()
                    : [];

                throw new Error(
                    validationErrors[0] ||
                    data.message ||
                    'Registration failed. Please try again.'
                );
            }

            // Redirect to Login after successful registration. Only say a
            // verification email is on its way when the server really delivers mail.
            const verification = data.email_verification;
            const registeredMessage =
                verification?.sent && verification?.delivery_available
                    ? 'Registration successful! We sent a verification link to your email address. Please verify it, then log in.'
                    : 'Registration successful! Please log in. You can verify your email address later from your Profile page.';

            navigate('/login', {
                state: {
                    message: registeredMessage,
                },
                replace: true,
            });
        } catch (error) {
            setMessage(
                error.message ||
                'Unable to connect to the server. Please try again.'
            );
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className={auth.registerPage}>
            <div className={auth.registerContainer}>

                <div className={auth.logoRow}>
                    <img src={logo} alt="TheraPlay" className={auth.logoImage} />
                </div>

                <div className={auth.headerText}>
                    <h1 className={auth.headerTitle}>Sign up</h1>
                    <p className={auth.subtitle}>
                        Let's get you all set up to access your personal account.
                    </p>
                </div>

                <form onSubmit={handleRegister}>

                    <p className="mb-6 text-[13px] font-bold text-muted" aria-live="polite">
                        Step {step} of 2: {step === 1 ? 'Your account' : "Your child's information"}
                    </p>

                    {step === 1 && (
                        <>
                    <div className={auth.inputRow}>
                        <div className={auth.fieldInRow}>
                            <input className={auth.input}
                                type="text"
                                id="firstName"
                                placeholder=" "
                                value={firstName}
                                onChange={(event) =>
                                    setFirstName(event.target.value)
                                }
                                required
                            />
                            <label className={auth.label} htmlFor="firstName">First Name</label>
                        </div>

                        <div className={auth.fieldInRow}>
                            <input className={auth.input}
                                type="text"
                                id="lastName"
                                placeholder=" "
                                value={lastName}
                                onChange={(event) =>
                                    setLastName(event.target.value)
                                }
                                required
                            />
                            <label className={auth.label} htmlFor="lastName">Last Name</label>
                        </div>
                    </div>

                    <div className={auth.inputRow}>
                        <div className={auth.fieldInRow}>
                            <input className={auth.input}
                                type="email"
                                id="email"
                                placeholder=" "
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                required
                            />
                            <label className={auth.label} htmlFor="email">Email</label>
                        </div>

                        <div className={auth.fieldInRow}>
                            <input className={auth.input}
                                type="tel"
                                id="phone"
                                placeholder=" "
                                value={phone}
                                onChange={(event) =>
                                    setPhone(event.target.value)
                                }
                                required
                            />
                            <label className={auth.label} htmlFor="phone">Phone Number</label>
                        </div>
                    </div>

                    <div className={auth.field}>
                        <input className={auth.input}
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            placeholder=" "
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            required
                        />
                        <label className={auth.label} htmlFor="password">Password</label>

                        <button
                            type="button"
                            className={auth.showPassword}
                            onClick={() =>
                                setShowPassword(!showPassword)
                            }
                            aria-label="Toggle password visibility"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                stroke="currentColor"
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                {showPassword ? (
                                    <>
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </>
                                ) : (
                                    <>
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8s-4 8-11 8a10.05 10.05 0 0 1-5.94-2.06" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </>
                                )}
                            </svg>
                        </button>
                    </div>

                    <div className={auth.field}>
                        <input className={auth.input}
                            type={showConfirmPassword ? 'text' : 'password'}
                            id="confirmPassword"
                            placeholder=" "
                            value={confirmPassword}
                            onChange={(event) =>
                                setConfirmPassword(event.target.value)
                            }
                            required
                        />
                        <label className={auth.label} htmlFor="confirmPassword">
                            Confirm Password
                        </label>

                        <button
                            type="button"
                            className={auth.showPassword}
                            onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                            }
                            aria-label="Toggle confirm password visibility"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                width="20"
                                height="20"
                                stroke="currentColor"
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                {showConfirmPassword ? (
                                    <>
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </>
                                ) : (
                                    <>
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8s-4 8-11 8a10.05 10.05 0 0 1-5.94-2.06" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </>
                                )}
                            </svg>
                        </button>
                    </div>

                    <div className={auth.termsGroup}>
                        <label className={auth.termsLabel}>
                            <input type="checkbox" required className={auth.termsCheckbox} />
                            <span>
                                I agree to all the <strong className={auth.termsStrong}>Terms</strong> and{' '}
                                <strong className={auth.termsStrong}>Privacy Policies</strong>
                            </span>
                        </label>
                    </div>
                        </>
                    )}

                    {step === 2 && (
                        <div className="mb-6">

                            <p className="mb-5 text-[14px] leading-[1.5] text-muted">
                                Tell us about your first child. You can add more children after
                                creating an account.
                            </p>

                            <ChildFormFields
                                values={child}
                                onChange={setChild}
                                errors={childErrors}
                                disabled={isLoading}
                                idPrefix="register-child"
                            />

                        </div>
                    )}

                    {message && (
                        <p
                            role="alert"
                            className={isError ? auth.registerMessageError : auth.registerMessageSuccess}
                        >
                            {message}
                        </p>
                    )}

                    {step === 2 && (
                        <button
                            type="button"
                            className="mb-3 w-full cursor-pointer rounded-full border border-edge-strong btn-glass p-3 [font-family:inherit] text-[15px] font-bold text-ink enabled:hover:bg-hover"
                            onClick={() => {
                                setMessage('');
                                setStep(1);
                            }}
                            disabled={isLoading}
                        >
                            Back
                        </button>
                    )}

                    <button
                        type="submit"
                        className={auth.registerButton}
                        disabled={isLoading}
                    >
                        {isLoading
                            ? 'Creating account...'
                            : step === 1
                            ? 'Next'
                            : 'Create account'}
                    </button>
                </form>

                <p className={auth.switchLinkRegister}>
                    Already have an account?{' '}
                    <Link to="/login" className={auth.switchLinkAnchor}>Login</Link>
                </p>


            </div>
        </main>
    );
}

export default Register;