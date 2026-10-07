import { Link, useParams } from 'react-router-dom';
import './css/ActivityDetails.css';

function ActivityDetails() {

    const { activityId } = useParams();

    const activities = [
        {
            id: 1,
            title: 'Memory Match',
            category: 'Executive Functioning',
            difficulty: 'Easy',
            objective: 'Improve memory and concentration through matching activities.',
            instructions: [
                'Look at the cards carefully.',
                'Remember the position of each item.',
                'Match the cards with the same image.',
                'Continue until all pairs are matched.'
            ],
            materials: [
                'Activity cards',
                'Matching board'
            ]
        },

        {
            id: 2,
            title: 'Shape Sorting',
            category: 'Fine Motor Skills',
            difficulty: 'Medium',
            objective: 'Improve hand coordination by sorting different shapes.',
            instructions: [
                'Look at the different shapes.',
                'Pick up one shape at a time.',
                'Place each shape in its correct location.',
                'Repeat until all shapes are sorted.'
            ],
            materials: [
                'Shape pieces',
                'Sorting board'
            ]
        },

        {
            id: 3,
            title: 'Button Practice',
            category: 'Functional Skills',
            difficulty: 'Easy',
            objective: 'Improve fine motor skills and hand-eye coordination by practicing buttons.',
            instructions: [
                'Place the button board in front of you.',
                'Hold the button with your fingers.',
                'Practice buttoning and unbuttoning.',
                'Repeat the activity several times.'
            ],
            materials: [
                'Button board',
                'Shirt with buttons'
            ]
        }
    ];


    const activity = activities.find(
        (item) => item.id === Number(activityId)
    );


    if (!activity) {

        return (
            <div className="activity-not-found">

                <h1>
                    Activity Not Found
                </h1>

                <p>
                    The activity you are looking for does not exist.
                </p>

                <Link to="/activities">
                    Back to Activities
                </Link>

            </div>
        );

    }


    return (
        <div className="activity-details-page">

            {/* Main Content */}

            <main className="activity-details-content">

                <Link
                    to="/activities"
                    className="back-link"
                >
                    ← Back to Activities
                </Link>


                <div className="activity-details-card">

                    {/* Activity Image */}

                    <div className="activity-details-image">
                        Image
                    </div>


                    {/* Activity Information */}

                    <div className="activity-information">

                        <h1>
                            {activity.title}
                        </h1>

                        <div className="activity-tags">

                            <span>
                                {activity.category}
                            </span>

                            <span>
                                {activity.difficulty}
                            </span>

                        </div>


                        {/* Objective */}

                        <section className="details-section">

                            <h2>
                                Objective
                            </h2>

                            <p>
                                {activity.objective}
                            </p>

                        </section>


                        {/* Instructions */}

                        <section className="details-section">

                            <h2>
                                Instructions
                            </h2>

                            <ol>

                                {activity.instructions.map(
                                    (instruction, index) => (

                                        <li key={index}>
                                            {instruction}
                                        </li>

                                    )
                                )}

                            </ol>

                        </section>


                        {/* Materials */}

                        <section className="details-section">

                            <h2>
                                Materials
                            </h2>

                            <ul>

                                {activity.materials.map(
                                    (material, index) => (

                                        <li key={index}>
                                            {material}
                                        </li>

                                    )
                                )}

                            </ul>

                        </section>


                        <button
                            className="complete-button"
                            onClick={() =>
                                alert('Activity marked as completed!')
                            }
                        >
                            Mark as Completed
                        </button>

                    </div>

                </div>

            </main>

        </div>
    );
}

export default ActivityDetails;