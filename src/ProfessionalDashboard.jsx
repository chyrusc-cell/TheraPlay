import { Link } from 'react-router-dom';
import './css/ProfessionalDashboard.css';

function ProfessionalDashboard() {

    const recentUploads = [
        {
            id: 1,
            title: 'Color Matching',
            category: 'Visual Skills',
            date: 'Sept 1, 2026'
        },
        {
            id: 2,
            title: 'Hand Strength',
            category: 'Fine Motor Skills',
            date: 'Aug 31, 2026'
        },
        {
            id: 3,
            title: 'Daily Routine',
            category: 'Functional Skills',
            date: 'Aug 29, 2026'
        },
        {
            id: 4,
            title: 'Memory Match',
            category: 'Executive Functioning',
            date: 'Aug 27, 2026'
        }
    ];


    const weeklyProgress = [
        {
            day: 'Mon',
            completed: 25
        },
        {
            day: 'Tue',
            completed: 40
        },
        {
            day: 'Wed',
            completed: 35
        },
        {
            day: 'Thu',
            completed: 55
        },
        {
            day: 'Fri',
            completed: 45
        },
        {
            day: 'Sat',
            completed: 65
        },
        {
            day: 'Sun',
            completed: 75
        }
    ];


    return (
        <div className="professional-dashboard-page">

            {/* Main Content */}

            <main className="professional-dashboard-content">

                <div className="dashboard-header">

                    <h1>
                        Dashboard
                    </h1>

                    <p>
                        Overview of your TheraPlay activities and users.
                    </p>

                </div>


                {/* Statistics */}

                <section className="statistics-grid">

                    <div className="stat-card">

                        <div className="stat-number">
                            48
                        </div>

                        <div className="stat-label">
                            Total Activities
                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-number">
                            128
                        </div>

                        <div className="stat-label">
                            Total Users
                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-number">
                            342
                        </div>

                        <div className="stat-label">
                            Completed Activities
                        </div>

                    </div>

                </section>


                {/* Dashboard Sections */}

                <section className="dashboard-sections">

                    {/* Activity Progress */}

                    <div className="dashboard-panel">

                        <h2>
                            Activity Progress Overview
                        </h2>


                        <div className="bar-chart">

                            {weeklyProgress.map((item) => (

                                <div
                                    className="chart-item"
                                    key={item.day}
                                >

                                    <div className="chart-value">
                                        {item.completed}
                                    </div>

                                    <div
                                        className="chart-bar"
                                        style={{
                                            height: `${item.completed}%`
                                        }}
                                    >
                                    </div>

                                    <div className="chart-label">
                                        {item.day}
                                    </div>

                                </div>

                            ))}

                        </div>

                    </div>


                    {/* Recent Uploads */}

                    <div className="dashboard-panel">

                        <div className="panel-header">

                            <h2>
                                Recent Activity Uploads
                            </h2>

                            <Link to="/manage-activities">
                                View All
                            </Link>

                        </div>


                        <div className="recent-uploads">

                            {recentUploads.map((item) => (

                                <div
                                    className="upload-item"
                                    key={item.id}
                                >

                                    <div className="upload-image">
                                        Image
                                    </div>

                                    <div className="upload-info">

                                        <h3>
                                            {item.title}
                                        </h3>

                                        <p>
                                            {item.category}
                                        </p>

                                    </div>

                                    <div className="upload-date">
                                        {item.date}
                                    </div>

                                </div>

                            ))}

                        </div>

                    </div>

                </section>

            </main>

        </div>
    );
}

export default ProfessionalDashboard;