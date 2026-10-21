import { Link } from 'react-router-dom';
import './css/Progress.css';

function Progress() {
    return (
        <div className="progress-page">
            
            {/* Top Navigation */}
            <nav className="navbar">
                <div className="navbar-logo-section">
                    <div className="logo-icon-elephant"></div>
                    <span className="navbar-logo-text">TheraPlay!</span>
                </div>
                
                <div className="navbar-links">
                    <Link to="/dashboard">Home</Link>
                    <Link to="/activities">Activities</Link>
                    <Link to="/progress" className="active">My Progress</Link>
                    <Link to="/profile">Profile</Link>
                    <Link to="/contact">Contact Us</Link>
                </div>
                
                <div className="navbar-actions">
                    <button className="icon-button">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </button>
                    <button className="icon-button">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                    </button>
                    <div className="user-avatar"></div>
                </div>
            </nav>

            <main className="progress-content">
                
                <div className="progress-header">
                    <h1>My Progress</h1>
                </div>

                <div className="progress-sub-header">
                    <button className="dropdown-button">
                        Week of Oct 19-25, 2026
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </button>
                    <span className="sample-data-text">Sample data - illustrative progress view</span>
                </div>

                {/* 2-Column Grid Layout */}
                <div className="progress-grid">
                    
                    {/* Left Column */}
                    <div className="grid-col-left">
                        
                        {/* Weekly Participation Card */}
                        <div className="card">
                            <div className="card-header">
                                <h3>Weekly Participation</h3>
                            </div>
                            <div className="card-body">
                                <div className="participation-stats">
                                    <div className="stat-left">
                                        <h2>18 / 20</h2>
                                        <span>activities completed this week</span>
                                    </div>
                                    <div className="stat-right">
                                        <h2>90%</h2>
                                        <span>of weekly goal</span>
                                    </div>
                                </div>
                                
                                <div className="progress-bar-container large-bar">
                                    <div className="progress-bar-fill monochrome-fill" style={{ width: '90%' }}></div>
                                </div>

                                <div className="participation-boxes">
                                    <div className="sub-box">
                                        <span className="box-label">Avg. daily practice</span>
                                        <span className="box-value">2.6</span>
                                    </div>
                                    <div className="sub-box">
                                        <span className="box-label">Longest streak</span>
                                        <span className="box-value">5 days</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Skills Practiced Card */}
                        <div className="card">
                            <div className="card-header border-bottom">
                                <h3>Skills Practiced</h3>
                            </div>
                            <div className="card-body">
                                
                                <div className="skill-item">
                                    <div className="skill-info">
                                        <span>Fine motor</span>
                                        <span className="skill-stat">5 activities • 28%</span>
                                    </div>
                                    <div className="progress-bar-container">
                                        <div className="progress-bar-fill monochrome-fill" style={{ width: '28%' }}></div>
                                    </div>
                                </div>

                                <div className="skill-item">
                                    <div className="skill-info">
                                        <span>Social</span>
                                        <span className="skill-stat">4 activities • 22%</span>
                                    </div>
                                    <div className="progress-bar-container">
                                        <div className="progress-bar-fill monochrome-fill" style={{ width: '22%' }}></div>
                                    </div>
                                </div>

                                <div className="skill-item">
                                    <div className="skill-info">
                                        <span>Emotional</span>
                                        <span className="skill-stat">4 activities • 22%</span>
                                    </div>
                                    <div className="progress-bar-container">
                                        <div className="progress-bar-fill monochrome-fill" style={{ width: '22%' }}></div>
                                    </div>
                                </div>

                                <div className="skill-item">
                                    <div className="skill-info">
                                        <span>Cognitive</span>
                                        <span className="skill-stat">5 activities • 28%</span>
                                    </div>
                                    <div className="progress-bar-container">
                                        <div className="progress-bar-fill monochrome-fill" style={{ width: '28%' }}></div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="grid-col-right">
                        
                        {/* Activity Trend Card */}
                        <div className="card">
                            <div className="card-header border-bottom">
                                <h3>Activity Trend</h3>
                            </div>
                            <div className="card-body">
                                <div className="trend-header">
                                    <span>Activities completed per day</span>
                                    <span className="total-tag">18 total</span>
                                </div>
                                
                                <div className="bar-chart-container">
                                    <div className="chart-bar-group">
                                        <div className="bar monochrome-bar" style={{ height: '60%' }}></div>
                                        <span>Mon • 3</span>
                                    </div>
                                    <div className="chart-bar-group">
                                        <div className="bar monochrome-bar" style={{ height: '80%' }}></div>
                                        <span>Tue • 4</span>
                                    </div>
                                    <div className="chart-bar-group">
                                        <div className="bar monochrome-bar" style={{ height: '80%' }}></div>
                                        <span>Wed • 4</span>
                                    </div>
                                    <div className="chart-bar-group">
                                        <div className="bar monochrome-bar" style={{ height: '80%' }}></div>
                                        <span>Thu • 4</span>
                                    </div>
                                    <div className="chart-bar-group">
                                        <div className="bar monochrome-bar" style={{ height: '60%' }}></div>
                                        <span>Fri • 3</span>
                                    </div>
                                    <div className="chart-bar-group">
                                        <div className="bar empty-bar" style={{ height: '0%' }}></div>
                                        <span>Sat • 0</span>
                                    </div>
                                    <div className="chart-bar-group">
                                        <div className="bar empty-bar" style={{ height: '0%' }}></div>
                                        <span>Sun • 0</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Weekly Goal Progress Card */}
                        <div className="card">
                            <div className="card-header border-bottom">
                                <h3>Weekly Goal Progress</h3>
                            </div>
                            <div className="card-body">
                                
                                <div className="goal-header">
                                    <div className="goal-text">
                                        <h2>90%</h2>
                                        <span>of weekly goal reached</span>
                                    </div>
                                    <span className="status-tag monochrome-tag">ON TRACK</span>
                                </div>
                                
                                <div className="progress-bar-container large-bar" style={{ marginBottom: '24px' }}>
                                    <div className="progress-bar-fill monochrome-fill" style={{ width: '90%' }}></div>
                                </div>

                                <h4 className="milestone-title">Participation milestones</h4>
                                
                                <div className="milestone-list">
                                    <div className="milestone-item">
                                        <div className="icon-circle completed">
                                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        </div>
                                        <div className="milestone-text">
                                            <h5>5-day practice streak</h5>
                                            <p>You practiced Monday through Friday this week.</p>
                                        </div>
                                    </div>

                                    <div className="milestone-item">
                                        <div className="icon-circle completed">
                                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        </div>
                                        <div className="milestone-text">
                                            <h5>4 skills practiced</h5>
                                            <p>Fine motor, Social, Emotional, and Cognitive activities were all covered this week.</p>
                                        </div>
                                    </div>

                                    <div className="milestone-item">
                                        <div className="icon-circle completed">
                                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        </div>
                                        <div className="milestone-text">
                                            <h5>18 activities completed</h5>
                                            <p>That's a strong week of consistent practice and participation.</p>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                </div>

            </main>
        </div>
    );
}

export default Progress;