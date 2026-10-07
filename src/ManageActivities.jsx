import { useState } from 'react';
import './css/ManageActivities.css';

function ManageActivities() {

    const [activities, setActivities] = useState([
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
        }
    ]);


    const [showForm, setShowForm] = useState(false);

    const [newTitle, setNewTitle] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [newDifficulty, setNewDifficulty] = useState('Easy');


    const handleAddActivity = (event) => {

        event.preventDefault();

        const newActivity = {
            id: Date.now(),
            title: newTitle,
            category: newCategory,
            difficulty: newDifficulty
        };

        setActivities([
            ...activities,
            newActivity
        ]);

        setNewTitle('');
        setNewCategory('');
        setNewDifficulty('Easy');

        setShowForm(false);
    };


    const handleDeleteActivity = (id) => {

        const confirmed = window.confirm(
            'Are you sure you want to delete this activity?'
        );

        if (!confirmed) {
            return;
        }

        setActivities(
            activities.filter(
                (activity) => activity.id !== id
            )
        );
    };


    return (
        <div className="manage-activities-page">

            {/* Main Content */}

            <main className="manage-activities-content">

                <div className="page-header">

                    <div>

                        <h1>
                            Manage Activities
                        </h1>

                        <p>
                            Create and manage activities available
                            on TheraPlay.
                        </p>

                    </div>


                    <button
                        className="add-activity-button"
                        onClick={() => setShowForm(!showForm)}
                    >
                        + Add Activity
                    </button>

                </div>


                {/* Add Activity Form */}

                {showForm && (

                    <section className="activity-form">

                        <h2>
                            Add New Activity
                        </h2>


                        <form onSubmit={handleAddActivity}>

                            <div className="form-group">

                                <label>
                                    Activity Name
                                </label>

                                <input
                                    type="text"
                                    placeholder="Enter activity name"
                                    value={newTitle}
                                    onChange={(event) =>
                                        setNewTitle(event.target.value)
                                    }
                                    required
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    Category
                                </label>

                                <input
                                    type="text"
                                    placeholder="Enter category"
                                    value={newCategory}
                                    onChange={(event) =>
                                        setNewCategory(event.target.value)
                                    }
                                    required
                                />

                            </div>


                            <div className="form-group">

                                <label>
                                    Difficulty
                                </label>

                                <select
                                    value={newDifficulty}
                                    onChange={(event) =>
                                        setNewDifficulty(event.target.value)
                                    }
                                >

                                    <option value="Easy">
                                        Easy
                                    </option>

                                    <option value="Medium">
                                        Medium
                                    </option>

                                    <option value="Hard">
                                        Hard
                                    </option>

                                </select>

                            </div>


                            <div className="form-actions">

                                <button
                                    type="submit"
                                    className="save-button"
                                >
                                    Add Activity
                                </button>

                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={() => setShowForm(false)}
                                >
                                    Cancel
                                </button>

                            </div>

                        </form>

                    </section>

                )}


                {/* Activities Table */}

                <section className="activities-table-container">

                    <table className="activities-table">

                        <thead>

                            <tr>

                                <th>
                                    Activity
                                </th>

                                <th>
                                    Category
                                </th>

                                <th>
                                    Difficulty
                                </th>

                                <th>
                                    Actions
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {activities.map((activity) => (

                                <tr key={activity.id}>

                                    <td>
                                        {activity.title}
                                    </td>

                                    <td>
                                        {activity.category}
                                    </td>

                                    <td>

                                        <span className="difficulty-badge">
                                            {activity.difficulty}
                                        </span>

                                    </td>

                                    <td>

                                        <div className="table-actions">

                                            <button
                                                className="edit-button"
                                                onClick={() =>
                                                    alert(
                                                        `Edit ${activity.title} - editing will be added later.`
                                                    )
                                                }
                                            >
                                                Edit
                                            </button>

                                            <button
                                                className="delete-button"
                                                onClick={() =>
                                                    handleDeleteActivity(
                                                        activity.id
                                                    )
                                                }
                                            >
                                                Delete
                                            </button>

                                        </div>

                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                </section>

            </main>

        </div>
    );
}

export default ManageActivities;