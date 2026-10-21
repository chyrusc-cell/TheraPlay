import { Link } from 'react-router-dom';
import './css/Activities.css';

function Activities() {
    // Data updated to match the descriptions shown in the reference image
    const activities = [
        {
            id: 1,
            title: 'Memory Match',
            description: 'This guide provides practical support and empowering advice for children and lots of supportive way.'
        },
        {
            id: 2,
            title: 'Shape Sorting',
            description: 'Nurturing strength and adaptability in young minds. Equipping children to face challenges with courage.'
        },
        {
            id: 3,
            title: 'Button Practice',
            description: 'Building a strong foundation for the future. Protecting what matters most: your family\'s well-being.'
        },
        {
            id: 4,
            title: 'Handwriting Lines',
            description: 'This guide provides practical support and empowering advice for children.'
        },
        {
            id: 5,
            title: 'Sensory Bin',
            description: 'Nurturing strength and adaptability in young minds. Equipping children to face.'
        },
        {
            id: 6,
            title: 'Color Matching',
            description: 'Building a strong foundation for the future.'
        }
    ];

    return (
        <div className="activities-page">
            
            <nav className="navbar">
                <div className="navbar-logo-section">
                    <Link to="/dashboard" className="logo-link">
                        <img 
                            src="./img/theraplaylogo2.png"
                            alt="TheraPlay Logo" 
                            className="navbar-logo-image" 
                        />
                    </Link>
                </div>
                
                <div className="navbar-links">
                    <Link to="/dashboard">Home</Link>
                    <Link to="/activities" className="active">Activities</Link>
                    <Link to="/progress">My Progress</Link>
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

            {/* Main Content */}
            <main className="activities-content">
                
                <div className="activities-header">
                    <h1>Activities</h1>
                    <p>Explore activities designed to help develop different skills.</p>
                </div>

                {/* Activity Cards Grid */}
                <div className="activities-grid">
                    {activities.map((activity) => (
                        <div className="activity-card" key={activity.id}>
                            
                            {/* Placeholder for the specific activity images */}
                            <div className="activity-image-wrapper">
                                <div className={`activity-image img-placeholder-${activity.id}`}></div>
                            </div>

                            <div className="activity-info">
                                <h2>{activity.title}</h2>
                                <p className="activity-desc">{activity.description}</p>
                                
                                <Link to={`/activities/${activity.id}`} className="activity-link">
                                    View Activity 
                                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none">
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                        <polyline points="12 5 19 12 12 19"></polyline>
                                    </svg>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

            </main>
        </div>
    );
}

export default Activities;