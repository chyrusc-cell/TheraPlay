import { Link } from 'react-router-dom';
import './css/Dashboard.css';

function Dashboard() {
    return (
        <div className="dashboard-page">

            {/* Main Content */}
            <main className="dashboard-content">

                <section className="welcome-section">

                    <h1>
                        Welcome to TheraPlay!
                    </h1>

                    <p>
                        Explore activities designed to make learning
                        engaging and enjoyable.
                    </p>

                </section>


                {/* Feature Cards */}
                <section className="dashboard-cards">

                    <div className="dashboard-card">

                        <h2>Activities</h2>

                        <p>
                            Explore interactive activities and games
                            available in TheraPlay.
                        </p>

                        <Link to="/activities">
                            Explore Activities
                        </Link>

                    </div>


                    <div className="dashboard-card">

                        <h2>My Progress</h2>

                        <p>
                            Track your progress and see how you're
                            improving over time.
                        </p>

                        <Link to="/progress">
                            View Progress
                        </Link>

                    </div>


                    <div className="dashboard-card">

                        <h2>My Profile</h2>

                        <p>
                            View and manage your TheraPlay account.
                        </p>

                        <Link to="/profile">
                            View Profile
                        </Link>

                    </div>

                </section>

            </main>

        </div>
    );
}

export default Dashboard;