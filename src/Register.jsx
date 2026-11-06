import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as auth from './authClasses.js';
import PhoneInput from './PhoneInput.jsx';
import { isCompletePhone, PHONE_ERROR } from './phoneFormat.js';
import { logo } from './brand.js';
import { API_URL } from './api.js';

function Register() {
    const navigate = useNavigate();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

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

        if (!isCompletePhone(phone)) {
            setMessage(PHONE_ERROR);
            setIsError(true);
            return;
        }

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
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                const validationErrors = data.errors
                    ? Object.values(data.errors).flat()
                    : [];

                throw new Error(
                    validationErrors[0] ||
                    data.message ||
                    'Registration failed. Please try again.'
                );
            }

            // The account exists but is NOT usable yet. Stay signed in (so the next
            // stages need no login page) and continue to the email code screen. Only say
            // a message is on its way when the server really sent one.
            localStorage.setItem('theraplay_token', data.token);
            sessionStorage.removeItem('theraplay_token');
            localStorage.setItem('theraplay_user', JSON.stringify(data.user));
            sessionStorage.removeItem('theraplay_user');

            const verification = data.email_verification;

            navigate('/verify-code', {
                state: { sent: Boolean(verification?.sent && verification?.delivery_available) },
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
                            <PhoneInput className={auth.input}
                                id="phone"
                                value={phone}
                                onChange={setPhone}
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
                    {message && (
                        <p
                            role="alert"
                            className={isError ? auth.registerMessageError : auth.registerMessageSuccess}
                        >
                            {message}
                        </p>
                    )}

                    <button
                        type="submit"
                        className={auth.registerButton}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Creating account...' : 'Create account'}
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