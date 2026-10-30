import { Link } from 'react-router-dom';
import { useChildren } from './childContext.js';

const panelClass =
    'mx-auto max-w-[560px] rounded-xl border border-edge bg-white card-soft px-6 py-10 text-center';
const buttonClass =
    'mt-5 inline-block cursor-pointer rounded-full border-0 bg-primary px-6 py-2.5 [font-family:inherit] text-[14px] font-bold text-white no-underline enabled:hover:bg-primary-hover btn-solid';

// Shown instead of child-dependent content when the parent has no child profile.
export function NoChildPrompt() {
    return (
        <div className={panelClass}>
            <h2 className="mb-2 text-[20px] font-bold text-ink">Add a child profile first</h2>
            <p className="text-[14px] leading-[1.6] text-muted">
                Activities, progress and your dashboard are shown for one child at a time,
                so you need a child profile to see them. Your account settings are still
                available.
            </p>
            <Link to="/profile" state={{ addChild: true }} className={buttonClass}>
                Add a child profile
            </Link>
        </div>
    );
}

// Shown when the list of children could not be loaded.
export function ChildLoadError() {
    const { refreshChildren } = useChildren();

    return (
        <div className={panelClass} role="alert">
            <p className="text-[14px] text-[#d93025]">
                We could not load your child profiles. Please try again.
            </p>
            <button type="button" className={buttonClass} onClick={refreshChildren}>
                Try again
            </button>
        </div>
    );
}
