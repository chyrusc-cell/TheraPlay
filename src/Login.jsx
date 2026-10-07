import { useState } from 'react';
import { Link } from 'react-router-dom';
import './css/Login.css';

function Login() {

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = (event) => {
        event.preventDefault();

        alert(`Login attempted with ${email}`);
    };

    return (
        <div className="login-page">

            <div className="login-container">

                <h1>TheraPlay</h1>

                <p className="login-subtitle">
                    Welcome back!
                </p>

                <form onSubmit={handleLogin}>

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

                        <div className="password-input">

                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter your password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                required
                            />

                            <button
                                type="button"
                                className="show-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </button>

                        </div>
                    </div>


                    <div className="login-options">

                        <label className="remember-me">
                            <input type="checkbox" />
                            Remember me
                        </label>

                        <Link to="/forgot-password">
                            Forgot Password?
                        </Link>

                    </div>


                    <button
                        type="submit"
                        className="login-button"
                    >
                        Login
                    </button>

                </form>


                <p className="register-link">
                    Don't have an account?{' '}
                    <Link to="/register">
                        Create Account
                    </Link>
                </p>

            </div>

        </div>
    );
}

export default Login;