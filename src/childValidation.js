// Same limits as the server: not in the future, not more than 18 years ago.
export const dateLimits = () => {
    const today = new Date();
    const oldest = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const iso = (date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    return { min: iso(oldest), max: iso(today) };
};

// Quick check before sending. Laravel repeats every check.
export const validateChild = ({ name, dateOfBirth }) => {
    const errors = {};

    if (!name.trim()) {
        errors.name = "Please enter your child's name.";
    }

    if (dateOfBirth) {
        const { min, max } = dateLimits();

        if (dateOfBirth > max) {
            errors.date_of_birth = 'The date of birth cannot be in the future.';
        } else if (dateOfBirth < min) {
            errors.date_of_birth = 'Please check the date of birth (a child is up to 18 years old).';
        }
    }

    return errors;
};
