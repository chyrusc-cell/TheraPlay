import { useState } from 'react';
import { Link } from 'react-router-dom';
import './css/ForgotPassword.css';

function ForgotPassword() {

    const [email, setEmail] = useState('');

    const handleSubmit = (event) => {

        event.preventDefault();

        alert(`Password reset request sent to ${email}`);

    };

    return (
        <div className="forgot-password-page">

            <div className="forgot-password-container">

                <h1>Forgot Password?</h1>

                <p className="forgot-password-subtitle">
                    Enter your email and we'll help you reset your password.
                </p>


                <form onSubmit={handleSubmit}>

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


                    <button
                        type="submit"
                        className="reset-button"
                    >
                        Reset Password
                    </button>

                </form>


                <p className="back-login">
                    Remember your password?{' '}
                    <Link to="/login">
                        Back to Login
                    </Link>
                </p>

            </div>

        </div>
    );
}

export default ForgotPassword;