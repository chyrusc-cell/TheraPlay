import { useState } from 'react';
import { Link } from 'react-router-dom';
import './css/Progress.css';

function Progress() {

    const [activeTab, setActiveTab] = useState('activity');


    const recentActivities = [
        {
            id: 1,
            activity: 'Button Practice',
            category: 'Functional Skills',
            date: 'Sept 1, 2026',
            status: 'Completed'
        },
        {
            id: 2,
            activity: 'Memory Match',
            category: 'Executive Functioning',
            date: 'Aug 26, 2026',
            status: 'Completed'
        },
        {
            id: 3,
            activity: 'Handwriting Lines',
            category: 'Handwriting',
            date: 'Aug 25, 2026',
            status: 'In Progress'
        },
        {
            id: 4,
            activity: 'Color Matching',
            category: 'Visual Skills',
            date: 'Aug 20, 2026',
            status: 'Completed'
        }
    ];


    const categoryProgress = [
        {
            category: 'Executive Functioning',
            completed: 4,
            total: 6
        },
        {
            category: 'Fine Motor Skills',
            completed: 3,
            total: 5
        },
        {
            category: 'Functional Skills',
            completed: 3,
            total: 4
        },
        {
            category: 'Handwriting',
            completed: 2,
            total: 5
        }
    ];


    return (
        <div className="progress-page">

            {/* Main Content */}

            <main className="progress-content">

                <div className="progress-header">

                    <h1>
                        My Progress
                    </h1>

                    <p>
                        Track your activities and see your progress over time.
                    </p>

                </div>


                {/* Summary Cards */}

                <section className="progress-summary">

                    <div className="progress-card">

                        <span className="progress-number">
                            12
                        </span>

                        <span className="progress-label">
                            Activities Completed
                        </span>

                    </div>


                    <div className="progress-card">

                        <span className="progress-number">
                            5
                        </span>

                        <span className="progress-label">
                            In Progress
                        </span>

                    </div>


                    <div className="progress-card">

                        <span className="progress-number">
                            2
                        </span>

                        <span className="progress-label">
                            Not Started
                        </span>

                    </div>

                </section>


                {/* Progress Tabs */}

                <div className="progress-tabs">

                    <button
                        className={
                            activeTab === 'activity'
                                ? 'progress-tab active'
                                : 'progress-tab'
                        }
                        onClick={() => setActiveTab('activity')}
                    >
                        Activity Progress
                    </button>

                    <button
                        className={
                            activeTab === 'category'
                                ? 'progress-tab active'
                                : 'progress-tab'
                        }
                        onClick={() => setActiveTab('category')}
                    >
                        Category Progress
                    </button>

                </div>


                {/* Activity Progress */}

                {activeTab === 'activity' && (

                    <section className="recent-activity">

                        <div className="section-header">

                            <h2>
                                Recent Activity
                            </h2>

                            <Link to="/activities">
                                View All
                            </Link>

                        </div>


                        <div className="activity-table">

                            <div className="table-header">

                                <span>Activity</span>
                                <span>Category</span>
                                <span>Date Completed</span>
                                <span>Status</span>

                            </div>


                            {recentActivities.map((item) => (

                                <div
                                    className="table-row"
                                    key={item.id}
                                >

                                    <span>
                                        {item.activity}
                                    </span>

                                    <span>
                                        {item.category}
                                    </span>

                                    <span>
                                        {item.date}
                                    </span>

                                    <span
                                        className={
                                            item.status === 'Completed'
                                                ? 'status completed'
                                                : 'status in-progress'
                                        }
                                    >
                                        {item.status}
                                    </span>

                                </div>

                            ))}

                        </div>

                    </section>

                )}


                {/* Category Progress */}

                {activeTab === 'category' && (

                    <section className="category-progress">

                        <h2>
                            Category Progress
                        </h2>


                        <div className="category-list">

                            {categoryProgress.map((item) => {

                                const percentage =
                                    (item.completed / item.total) * 100;

                                return (
                                    <div
                                        className="category-progress-item"
                                        key={item.category}
                                    >

                                        <div className="category-progress-header">

                                            <span>
                                                {item.category}
                                            </span>

                                            <span>
                                                {item.completed}/{item.total}
                                            </span>

                                        </div>


                                        <div className="progress-bar">

                                            <div
                                                className="progress-bar-fill"
                                                style={{
                                                    width: `${percentage}%`
                                                }}
                                            >
                                            </div>

                                        </div>

                                    </div>
                                );

                            })}

                        </div>

                    </section>

                )}

            </main>

        </div>
    );
}

export default Progress;