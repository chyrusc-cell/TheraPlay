import { Link } from 'react-router-dom';
import { useDocumentTitle } from './useDocumentTitle.js';
import { pageMainNarrow, pageTitle, pageSubtitle } from './uiClasses.js';

/* Shown for any address that is not a page of the app. */
function NotFound() {
    useDocumentTitle('Page not found');

    return (
        <div className={pageMainNarrow}>
            <h1 className={pageTitle}>Page not found</h1>
            <p className={pageSubtitle}>
                The page you are looking for does not exist or may have moved.
            </p>
            <p className="mt-6">
                <Link
                    to="/"
                    className="inline-block rounded-full btn-solid px-5 py-2.5 text-[14px] font-bold no-underline"
                >
                    Go to the home page
                </Link>
            </p>
        </div>
    );
}

export default NotFound;
