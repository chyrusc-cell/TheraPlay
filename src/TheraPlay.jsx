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

function TheraPlay() {

    return (
        <BrowserRouter>

            <Routes>

                {/* Pages without sidebar */}

                <Route
                    path="/"
                    element={<Navigate to="/login" replace />}
                />

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

                </Route>

            </Routes>

        </BrowserRouter>
    );
}

export default TheraPlay;