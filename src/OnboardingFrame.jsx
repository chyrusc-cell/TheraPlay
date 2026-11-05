import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as auth from './authClasses.js';
import { logo } from './brand.js';
import { API_URL, clearSession, getToken } from './api.js';

// The three stages of signing up as a parent, shown on the verification and the
// child profile pages so it feels like one continuous process.
const STAGES = ['Create account', 'Verify email', 'Child profile'];

const stageClass = (state) =>
    `flex flex-1 flex-col items-center gap-1.5 text-center text-[12px] font-bold ${
        state === 'current' ? 'text-ink' : state === 'done' ? 'text-[#188038]' : 'text-faint'
    }`;

const dotClass = (state) =>
    `flex h-7 w-7 items-center justify-center rounded-full border text-[13px] ${
        state === 'current'
            ? 'border-ink bg-white text-ink'
            : state === 'done'
              ? 'border-[#188038] bg-[#188038] text-white'
              : 'border-edge-strong bg-white text-faint'
    }`;

/*
 * Shared frame of the two sign-up stages after the account exists: the logo, a
 * "Step N of 3" indicator, the page content, and a way to log out (these pages
 * have no sidebar). `current` is 2 (verify email) or 3 (child profile).
 */
function OnboardingFrame({ current, title, subtitle, children }) {
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        if (isLoggingOut) {
            return;
        }

        setIsLoggingOut(true);

        try {
            await fetch(`${API_URL}/logout`, {
                method: 'POST',
                headers: { Accept: 'application/json', Authorization: `Bearer ${getToken()}` },
            });
        } catch {
            // The local login is removed either way.
        }

        clearSession();
        navigate('/login', { replace: true });
    };

    return (
        <main className={auth.registerPage}>
            <div className={auth.registerContainer}>

                <div className={auth.logoRow}>
                    <img src={logo} alt="TheraPlay" className={auth.logoImage} />
                </div>

                <ol className="mb-8 flex items-start gap-2" aria-label="Sign-up progress">
                    {STAGES.map((name, index) => {
                        const number = index + 1;
                        const state = number < current ? 'done' : number === current ? 'current' : 'todo';

                        return (
                            <li
                                key={name}
                                className={stageClass(state)}
                                aria-current={state === 'current' ? 'step' : undefined}
                            >
                                <span className={dotClass(state)} aria-hidden="true">
                                    {state === 'done' ? '✓' : number}
                                </span>
                                <span>
                                    <span className="sr-only">Step {number} of 3: </span>
                                    {name}
                                    {state === 'done' && <span className="sr-only"> (done)</span>}
                                </span>
                            </li>
                        );
                    })}
                </ol>

                <div className={auth.headerText}>
                    <h1 className={auth.headerTitle}>{title}</h1>
                    {subtitle && <p className={auth.subtitle}>{subtitle}</p>}
                </div>

                {children}

                <p className={auth.switchLinkRegister}>
                    <button
                        type="button"
                        className="cursor-pointer border-0 bg-transparent p-0 [font-family:inherit] text-[14px] font-bold text-ink underline"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                    >
                        Log out
                    </button>
                </p>

            </div>
        </main>
    );
}

export default OnboardingFrame;
