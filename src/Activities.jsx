import { useState } from 'react';
import { Link } from 'react-router-dom';
import './css/Activities.css';

function Activities() {

    const [selectedCategory, setSelectedCategory] = useState('All');

    const activities = [
        {
            id: 1,
            title: 'Memory Match',
            category: 'Executive Functioning',
            difficulty: 'Easy'
        },
        {
            id: 2,
            title: 'Shape Sorting',
            category: 'Fine Motor Skills',
            difficulty: 'Medium'
        },
        {
            id: 3,
            title: 'Button Practice',
            category: 'Functional Skills',
            difficulty: 'Easy'
        },
        {
            id: 4,
            title: 'Handwriting Lines',
            category: 'Handwriting',
            difficulty: 'Medium'
        },
        {
            id: 5,
            title: 'Sensory Bin',
            category: 'Sensory Skills',
            difficulty: 'Easy'
        },
        {
            id: 6,
            title: 'Color Matching',
            category: 'Visual Skills',
            difficulty: 'Medium'
        }
    ];

    const categories = [
        'All',
        'Executive Functioning',
        'Fine Motor Skills',
        'Functional Skills',
        'Handwriting',
        'Sensory Skills',
        'Visual Skills'
    ];

    const filteredActivities =
        selectedCategory === 'All'
            ? activities
            : activities.filter(
                (activity) => activity.category === selectedCategory
            );

    return (
        <div className="activities-page">

            {/* Main Content */}

            <main className="activities-content">

                <div className="activities-header">

                    <h1>
                        Activities
                    </h1>

                    <p>
                        Explore activities designed to help
                        develop different skills.
                    </p>

                </div>


                {/* Category Filters */}

                <div className="category-filters">

                    {categories.map((category) => (

                        <button
                            key={category}
                            className={
                                selectedCategory === category
                                    ? 'category-button active'
                                    : 'category-button'
                            }
                            onClick={() => setSelectedCategory(category)}
                        >
                            {category}
                        </button>

                    ))}

                </div>


                {/* Activity Cards */}

                <div className="activities-grid">

                    {filteredActivities.map((activity) => (

                        <div
                            className="activity-card"
                            key={activity.id}
                        >

                            <div className="activity-image">
                                Image
                            </div>


                            <div className="activity-info">

                                <h2>
                                    {activity.title}
                                </h2>

                                <p className="activity-category">
                                    {activity.category}
                                </p>

                                <span className="difficulty">
                                    {activity.difficulty}
                                </span>

                                <Link
                                    to={`/activities/${activity.id}`}
                                    className="activity-link"
                                >
                                    View Activity →
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