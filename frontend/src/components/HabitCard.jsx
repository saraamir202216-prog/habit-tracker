import { Link } from "react-router-dom";

function scheduleLabel(habit) {
  if (habit.schedule_type === "daily") return "Every day";
  if (habit.schedule_type === "specific_days") {
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return habit.days_of_week.map((d) => names[d]).join(" / ");
  }
  return `${habit.target_count}x / week`;
}

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

/** Small 7-bar chart of the last 7 days, echoing the "Stats" bar
 * charts in bold habit-tracker app designs. `week` is a boolean[7]
 * (oldest to newest, ending today). */
function WeekBars({ week }) {
  if (!week.length) return null;
  const today = new Date();
  return (
    <div className="week-bars" aria-hidden="true">
      {week.map((done, i) => {
        const d = new Date(today);
        d.setUTCDate(d.getUTCDate() - (week.length - 1 - i));
        return (
          <div className="week-bar-col" key={i}>
            <div className={`week-bar ${done ? "week-bar-filled" : ""}`} />
            <span className="week-bar-label">{DAY_LETTERS[d.getUTCDay()]}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function HabitCard({ habit, doneToday, week = [], onToggleToday, onDelete }) {
  return (
    <div className="habit-card">
      <div className="habit-card-main">
        <Link to={`/habits/${habit._id}`} className="habit-name">
          {habit.name}
        </Link>
        <span className="habit-schedule">{scheduleLabel(habit)}</span>
        <WeekBars week={week} />
      </div>

      <div className="habit-card-streaks">
        <div className="streak-pill">
          🔥 {habit.current_streak} <span>current</span>
        </div>
        <div className="streak-pill streak-pill-muted">
          🏆 {habit.longest_streak} <span>best</span>
        </div>
      </div>

      <div className="habit-card-actions">
        <button
          className={`btn ${doneToday ? "btn-success" : "btn-outline"}`}
          onClick={onToggleToday}
        >
          {doneToday ? "✓ Done today" : "Mark today done"}
        </button>
        <button className="btn btn-danger-ghost" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}