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

function WeekBars({ week, dates }) {
  if (!week.length || !dates.length) return null;
  return (
    <div className="week-bars" aria-hidden="true">
      {dates.map((dateStr, i) => {
        const dow = new Date(dateStr + "T00:00:00.000Z").getUTCDay();
        return (
          <div className="week-bar-col" key={dateStr}>
            <div className={`week-bar ${week[i] ? "week-bar-filled" : ""}`} />
            <span className="week-bar-label">{DAY_LETTERS[dow]}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function HabitCard({
  habit,
  doneToday,
  week = [],
  weekDates = [],
  isScheduledToday = true,
  onToggleToday,
  onDelete,
}) {
  return (
    <div className="habit-card">
      <div className="habit-card-main">
        <div className="habit-name-row">
          <Link to={`/habits/${habit._id}`} className="habit-name">
            {habit.name}
          </Link>
          {habit.pendingMissedDate && (
            <span className="grace-badge" title="Missed a day - mark it today to save your streak">
              ⏳ Grace period
            </span>
          )}
        </div>
        <span className="habit-schedule">{scheduleLabel(habit)}</span>
        <WeekBars week={week} dates={weekDates} />
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
        {isScheduledToday ? (
          <button
            className={`btn ${doneToday ? "btn-success" : "btn-outline"}`}
            onClick={onToggleToday}
          >
            {doneToday ? "✓ Done today" : "Mark today done"}
          </button>
        ) : (
          <button className="btn btn-not-scheduled" disabled title="Not scheduled for today">
            Not scheduled today
          </button>
        )}
        <button className="btn btn-danger-ghost" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}