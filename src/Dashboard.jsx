import { Link } from 'react-router-dom';
import './css/Dashboard.css';

function Dashboard() {
    return (
        <div className="dashboard-page">

            <main className="dashboard-content">
                
                <header className="dashboard-header">
                    <h1>Hello, Frent Yvan!</h1>
                    <p>We provide a range of resources and guidance to support their physical, cognitive, emotional, and social growth.</p>
                    <span className="date-subtitle">Sample data • Week of Oct 19-25, 2026</span>
                </header>

                <div className="dashboard-top-grid">
                    <div className="card">
                        <div className="card-header-border">
                            <h3>Continue / Recommended Activity</h3>
                        </div>
                        <div className="card-body">
                            <div className="activity-title-row">
                                <h2>Fine Motor Play</h2>
                                <span className="time-tag">15 min</span>
                            </div>
                            <p className="card-desc">Pick up where you left off with a short hands-on activity. Practice at your own pace.</p>
                            <button className="btn-primary">Continue activity</button>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header-border">
                            <h3>Streak</h3>
                        </div>
                        <div className="card-body">
                            <div className="streak-header">
                                <div className="streak-count">
                                    <h2>5</h2>
                                    <span>Day practice streak</span>
                                </div>
                                <span className="status-tag monochrome-tag">ON TRACK</span>
                            </div>
                            <p className="streak-date">This week • Oct 19-25, 2026</p>
                            
                            <div className="streak-days">
                                <div className="day active">M</div>
                                <div className="day active">T</div>
                                <div className="day active">W</div>
                                <div className="day active">T</div>
                                <div className="day active">F</div>
                                <div className="day">S</div>
                                <div className="day">S</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card full-width-card">
                    <div className="card-header-border">
                        <h3>Summary of Progress</h3>
                    </div>
                    <div className="card-body progress-body">
                        <div className="progress-stats">
                            <div className="stat-box">
                                <span className="stat-label">Activities this week</span>
                                <h2>18 / 20</h2>
                                <span className="stat-sub">90% of weekly goal</span>
                            </div>
                            <div className="stat-box">
                                <span className="stat-label">Skills practiced</span>
                                <h2>4</h2>
                                <span className="stat-sub">Fine motor, Social, Emotional, Cognitive</span>
                            </div>
                        </div>
                        <div className="progress-footer">
                            <Link to="/progress-report" className="view-report-link">
                                View detailed progress report
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                    <polyline points="12 5 19 12 12 19"></polyline>
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="card full-width-card">
                    <div className="card-header-flex">
                        <h3>Recent Activities</h3>
                        <Link to="/activities/all" className="view-all-link">View all</Link>
                    </div>
                    <div className="recent-list">
                        
                        <div className="recent-item">
                            <div className="item-left">
                                <div className="icon-circle completed">
                                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <div className="item-text">
                                    <h4>Handwriting Lines</h4>
                                    <span>Fri, Oct 23 • 2026</span>
                                </div>
                            </div>
                            <span className="list-tag tag-completed">Completed</span>
                        </div>

                        <div className="recent-item">
                            <div className="item-left">
                                <div className="icon-circle completed">
                                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <div className="item-text">
                                    <h4>Memory Match</h4>
                                    <span>Thu, Oct 22 • 2026</span>
                                </div>
                            </div>
                            <span className="list-tag tag-completed">Completed</span>
                        </div>

                        <div className="recent-item">
                            <div className="item-left">
                                <div className="icon-circle in-progress">
                                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                </div>
                                <div className="item-text">
                                    <h4>Button Practice</h4>
                                    <span>Wed, Oct 21 • 2026</span>
                                </div>
                            </div>
                            <span className="list-tag tag-progress">In Progress</span>
                        </div>

                    </div>
                </div>

            </main>
        </div>
    );
}

export default Dashboard;