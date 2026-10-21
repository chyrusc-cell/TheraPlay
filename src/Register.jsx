import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './css/Register.css';

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

        setIsLoading(true);

        try {
            const response = await fetch(
                'http://127.0.0.1:8000/api/register',
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

            // Redirect to Login after successful registration
            navigate('/login', {
                state: {
                    message: 'Registration successful! Please log in.',
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
        <div className="register-page">
            <div className="register-container">

                <div className="header-logo">
                    <div className="logo-icon-elephant"></div>
                    <h2>TheraPlay!</h2>
                </div>

                <div className="header-text">
                    <h1>Sign up</h1>
                    <p className="subtitle">
                        Let's get you all set up to access your personal account.
                    </p>
                </div>

                <form onSubmit={handleRegister}>

                    <div className="input-row">
                        <div className="input-group">
                            <input
                                type="text"
                                id="firstName"
                                placeholder=" "
                                value={firstName}
                                onChange={(event) =>
                                    setFirstName(event.target.value)
                                }
                                required
                            />
                            <label htmlFor="firstName">First Name</label>
                        </div>

                        <div className="input-group">
                            <input
                                type="text"
                                id="lastName"
                                placeholder=" "
                                value={lastName}
                                onChange={(event) =>
                                    setLastName(event.target.value)
                                }
                                required
                            />
                            <label htmlFor="lastName">Last Name</label>
                        </div>
                    </div>

                    <div className="input-row">
                        <div className="input-group">
                            <input
                                type="email"
                                id="email"
                                placeholder=" "
                                value={email}
                                onChange={(event) =>
                                    setEmail(event.target.value)
                                }
                                required
                            />
                            <label htmlFor="email">Email</label>
                        </div>

                        <div className="input-group">
                            <input
                                type="tel"
                                id="phone"
                                placeholder=" "
                                value={phone}
                                onChange={(event) =>
                                    setPhone(event.target.value)
                                }
                                required
                            />
                            <label htmlFor="phone">Phone Number</label>
                        </div>
                    </div>

                    <div className="input-group">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            placeholder=" "
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            required
                        />
                        <label htmlFor="password">Password</label>

                        <button
                            type="button"
                            className="show-password-icon"
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

                    <div className="input-group">
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            id="confirmPassword"
                            placeholder=" "
                            value={confirmPassword}
                            onChange={(event) =>
                                setConfirmPassword(event.target.value)
                            }
                            required
                        />
                        <label htmlFor="confirmPassword">
                            Confirm Password
                        </label>

                        <button
                            type="button"
                            className="show-password-icon"
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

                    <div className="terms-group">
                        <label className="terms-label">
                            <input type="checkbox" required />
                            <span>
                                I agree to all the <strong>Terms</strong> and{' '}
                                <strong>Privacy Policies</strong>
                            </span>
                        </label>
                    </div>

                    {message && (
                        <p
                            role="alert"
                            style={{
                                color: isError ? '#d93025' : '#188038',
                                margin: '12px 0',
                                fontSize: '14px',
                            }}
                        >
                            {message}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="register-button"
                        disabled={isLoading}
                    >
                        {isLoading
                            ? 'Creating account...'
                            : 'Create account'}
                    </button>
                </form>

                <p className="login-link">
                    Already have an account?{' '}
                    <Link to="/login">Login</Link>
                </p>

                <div className="divider">
                    <span>Or Sign up with</span>
                </div>

                <div className="social-login">
                    <button
                        type="button"
                        className="social-btn"
                        aria-label="Sign up with Facebook"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            width="20"
                            height="20"
                            fill="#1877F2"
                        >
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                    </button>

                    <button
                        type="button"
                        className="social-btn"
                        aria-label="Sign up with Google"
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                    </button>
                </div>

            </div>
        </div>
    );
}

export default Register;