import { useState } from "react";

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

/**
 * Shared create/edit form. `initial` (optional) pre-fills the form for
 * editing; `onSubmit` receives the assembled payload.
 */
export default function HabitForm({ initial, onSubmit, onCancel, busy }) {
  const [name, setName] = useState(initial?.name || "");
  const [scheduleType, setScheduleType] = useState(
    initial?.schedule_type || "daily"
  );
  const [daysOfWeek, setDaysOfWeek] = useState(initial?.days_of_week || []);
  const [targetCount, setTargetCount] = useState(initial?.target_count || 3);
  const [error, setError] = useState("");

  function toggleDay(value) {
    setDaysOfWeek((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("Habit name is required");
    if (scheduleType === "specific_days" && daysOfWeek.length === 0) {
      return setError("Pick at least one day of the week");
    }
    if (scheduleType === "weekly_target" && (!targetCount || targetCount < 1)) {
      return setError("Target count must be at least 1");
    }

    onSubmit({
      name: name.trim(),
      schedule_type: scheduleType,
      days_of_week: scheduleType === "specific_days" ? daysOfWeek : [],
      target_count: scheduleType === "weekly_target" ? Number(targetCount) : null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="form habit-form">
      <label>
        Habit name
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Go to the gym"
          required
        />
      </label>

      <label>
        Schedule type
        <select
          value={scheduleType}
          onChange={(e) => setScheduleType(e.target.value)}
        >
          <option value="daily">Daily - every day</option>
          <option value="specific_days">Specific weekdays</option>
          <option value="weekly_target">X times per week</option>
        </select>
      </label>

      {scheduleType === "specific_days" && (
        <div className="weekday-picker">
          {WEEKDAYS.map((d) => (
            <button
              type="button"
              key={d.value}
              className={`weekday-chip ${
                daysOfWeek.includes(d.value) ? "active" : ""
              }`}
              onClick={() => toggleDay(d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}

      {scheduleType === "weekly_target" && (
        <label>
          Times per week
          <input
            type="number"
            min={1}
            max={7}
            value={targetCount}
            onChange={(e) => setTargetCount(e.target.value)}
          />
        </label>
      )}

      {error && <p className="form-error">{error}</p>}

      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Saving..." : "Save habit"}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
