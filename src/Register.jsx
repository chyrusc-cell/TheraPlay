import { useState } from 'react';
import { Link } from 'react-router-dom';
import './css/Register.css';

function Register() {

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleRegister = (event) => {

        event.preventDefault();

        if (password !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }

        alert('Registration successful!');

    };

    return (
        <div className="register-page">

            <div className="register-container">

                <h1>Create Account</h1>

                <p className="register-subtitle">
                    Join TheraPlay today!
                </p>


                <form onSubmit={handleRegister}>

                    <div className="input-group">

                        <label>First Name</label>

                        <input
                            type="text"
                            placeholder="Enter your first name"
                            value={firstName}
                            onChange={(event) => setFirstName(event.target.value)}
                            required
                        />

                    </div>


                    <div className="input-group">

                        <label>Last Name</label>

                        <input
                            type="text"
                            placeholder="Enter your last name"
                            value={lastName}
                            onChange={(event) => setLastName(event.target.value)}
                            required
                        />

                    </div>


                    <div className="input-group">

                        <label>Email</label>

                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                        />

                    </div>


                    <div className="input-group">

                        <label>Password</label>

                        <input
                            type="password"
                            placeholder="Create a password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />

                    </div>


                    <div className="input-group">

                        <label>Confirm Password</label>

                        <input
                            type="password"
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            required
                        />

                    </div>


                    <button
                        type="submit"
                        className="register-button"
                    >
                        Create Account
                    </button>

                </form>


                <p className="login-link">
                    Already have an account?{' '}
                    <Link to="/login">
                        Login
                    </Link>
                </p>

            </div>

        </div>
    );
}

export default Register;