import useConditions from './useConditions.js';
import { dateLimits } from './childValidation.js';

const labelClass = 'mb-1.5 block text-[13px] font-bold text-ink';
const inputClass =
    'w-full rounded-xl border border-edge-strong bg-white px-3.5 py-2.5 [font-family:inherit] text-[15px] font-medium text-ink transition-[border-color] focus:border-accent';
const errorClass = 'mt-1.5 text-[13px] text-[#d93025]';

/*
 * The child's name, date of birth and conditions. Used by the sign-up form (step
 * 2) and by the Profile page (add / edit a child), so both look and behave the
 * same. values = { name, dateOfBirth, conditionIds }.
 */
function ChildFormFields({ values, onChange, errors = {}, disabled = false, idPrefix = 'child', inactiveConditions = [] }) {
    const { conditions, status, retry } = useConditions();
    const { min, max } = dateLimits();

    const toggleCondition = (id) => {
        const has = values.conditionIds.includes(id);

        onChange({
            ...values,
            conditionIds: has
                ? values.conditionIds.filter((value) => value !== id)
                : [...values.conditionIds, id],
        });
    };

    return (
        <div className="flex flex-col gap-5">

            <div>
                <label className={labelClass} htmlFor={`${idPrefix}-name`}>Child's name</label>
                <input
                    className={inputClass}
                    id={`${idPrefix}-name`}
                    type="text"
                    value={values.name}
                    maxLength={255}
                    onChange={(event) => onChange({ ...values, name: event.target.value })}
                    disabled={disabled}
                    required
                />
                {errors.name && <p className={errorClass}>{errors.name}</p>}
            </div>

            <div>
                <label className={labelClass} htmlFor={`${idPrefix}-dob`}>Date of birth (optional)</label>
                <input
                    className={inputClass}
                    id={`${idPrefix}-dob`}
                    type="date"
                    min={min}
                    max={max}
                    value={values.dateOfBirth}
                    onChange={(event) => onChange({ ...values, dateOfBirth: event.target.value })}
                    disabled={disabled}
                />
                {errors.date_of_birth && <p className={errorClass}>{errors.date_of_birth}</p>}
            </div>

            <fieldset className="m-0 min-w-0 border-0 p-0">
                <legend className={labelClass}>Conditions (optional)</legend>

                <p className="mb-3 text-[12px] leading-[1.5] text-faint">
                    These are conditions <strong>you report yourself</strong>, chosen from the
                    list we provide. They are not a professional diagnosis. Choose all that
                    apply; activities are suggested from them.
                </p>

                {status === 'loading' ? (
                    <p className="text-[13px] text-muted" role="status">Loading conditions...</p>
                ) : status === 'error' ? (
                    <p className="text-[13px] text-[#d93025]" role="alert">
                        Could not load the conditions.{' '}
                        <button
                            type="button"
                            onClick={retry}
                            className="cursor-pointer border-0 bg-transparent p-0 [font-family:inherit] text-[13px] font-bold text-ink underline"
                        >
                            Try again
                        </button>
                    </p>
                ) : conditions.length === 0 && inactiveConditions.length === 0 ? (
                    <p className="text-[13px] text-muted">
                        No conditions are available yet. An administrator adds the conditions you can
                        choose from, so there is nothing to select for now; the rest of the profile
                        can still be saved.
                    </p>
                ) : (
                    <ul className="grid list-none grid-cols-2 gap-2 phone:grid-cols-1">
                        {conditions.map((condition) => (
                            <li key={condition.id}>
                                <label
                                    className="flex cursor-pointer items-start gap-2 rounded-lg border border-edge card-soft px-3 py-2 text-[14px] text-ink"
                                    title={condition.description || undefined}
                                >
                                    <input
                                        type="checkbox"
                                        className="mt-0.5 shrink-0 accent-accent"
                                        checked={values.conditionIds.includes(condition.id)}
                                        onChange={() => toggleCondition(condition.id)}
                                        disabled={disabled}
                                    />
                                    <span className="[overflow-wrap:anywhere]">{condition.name}</span>
                                </label>
                            </li>
                        ))}
                    </ul>
                )}

                {inactiveConditions.length > 0 && (
                    <p className="mt-2 text-[12px] text-faint">
                        Also on file (no longer offered): {inactiveConditions.map((c) => c.name).join(', ')}.
                    </p>
                )}

                {errors.condition_ids && <p className={errorClass}>{errors.condition_ids}</p>}
            </fieldset>

        </div>
    );
}

export default ChildFormFields;
