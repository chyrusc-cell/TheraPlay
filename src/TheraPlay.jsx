import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from 'react-router-dom';

import Login from './Login.jsx';
import Register from './Register.jsx';
import ForgotPassword from './ForgotPassword.jsx';
import Dashboard from './Dashboard.jsx';
import Activities from './Activities.jsx';
import ActivityDetails from './ActivityDetails.jsx';
import Progress from './Progress.jsx';
import ProfessionalDashboard from './ProfessionalDashboard.jsx';
import ManageActivities from './ManageActivities.jsx';
import Profile from './Profile.jsx';
import Layout from './Layout.jsx';
import RequireRole from './RequireRole.jsx';
import Contact from './Contact.jsx';
import ManageContacts from './ManageContacts.jsx';
import ManageAccounts from './ManageAccounts.jsx';
import ResetPassword from './ResetPassword.jsx';
import NotFound from './NotFound.jsx';
import VerifyEmail from './VerifyEmail.jsx';
import GuestOnly from './GuestOnly.jsx';

// Shared look and responsive rules. Keep these LAST so they win over the
// older page stylesheets imported above.
import './css/ui.css';
import './css/responsive.css';

// The route table on its own (no router), so tests can render it inside a
// MemoryRouter. TheraPlay below is what the app mounts.
export function AppRoutes() {

    return (
            <Routes>

                {/* Pages without sidebar */}

                <Route
                    path="/"
                    element={<Navigate to="/login" replace />}
                />

                {/* Only for logged-out visitors: a logged-in person is sent to their dashboard */}
                <Route element={<GuestOnly />}>

                    <Route
                        path="/login"
                        element={<Login />}
                    />

                    <Route
                        path="/register"
                        element={<Register />}
                    />

                    <Route
                        path="/forgot-password"
                        element={<ForgotPassword />}
                    />

                </Route>

                {/* Opened from the link in the email verification email */}
                <Route
                    path="/verify-email"
                    element={<VerifyEmail />}
                />

                {/* Opened from the link in the password reset email */}
                <Route
                    path="/reset-password"
                    element={<ResetPassword />}
                />


                {/* Pages with sidebar */}

                <Route element={<Layout />}>

                    <Route
                        path="/dashboard"
                        element={<Dashboard />}
                    />

                    <Route
                        path="/activities"
                        element={<Activities />}
                    />

                    <Route
                        path="/activities/:activityId"
                        element={<ActivityDetails />}
                    />

                    <Route
                        path="/progress"
                        element={<Progress />}
                    />

                    <Route
                        path="/profile"
                        element={<Profile />}
                    />

                    {/* Contact list is public; only the feedback form needs a parent login */}
                    <Route
                        path="/contact"
                        element={<Contact />}
                    />

                    {/* Admin-only pages */}
                    <Route element={<RequireRole role="admin" />}>

                        <Route
                            path="/professional-dashboard"
                            element={<ProfessionalDashboard />}
                        />

                        <Route
                            path="/manage-activities"
                            element={<ManageActivities />}
                        />

                        <Route
                            path="/manage-contacts"
                            element={<ManageContacts />}
                        />

                        <Route
                            path="/manage-accounts"
                            element={<ManageAccounts />}
                        />

                    </Route>

                    {/* Any other address */}
                    <Route
                        path="*"
                        element={<NotFound />}
                    />

                </Route>

            </Routes>
    );
}

function TheraPlay() {

    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    );
}

export default TheraPlay;