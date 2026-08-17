function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function isExpected(habit, dateStr) {
  if (habit.schedule_type === "daily") return true;
  if (habit.schedule_type === "specific_days") {
    const dow = new Date(dateStr + "T00:00:00.000Z").getUTCDay();
    return (habit.days_of_week || []).includes(dow);
  }
  // weekly_target habits aren't "expected" on a specific day, so every
  // day is shown as a neutral square unless it was actually completed.
  return false;
}

/**
 * Last `days` days, oldest to newest, as a grid of colored squares -
 * the single highest-value visual called out in the Business Brief
 * (Section 3.6).
 *   green  = completed
 *   grey   = expected but not completed (and in the past)
 *   faint  = not an expected day for this habit's schedule
 *   outline = today, not yet logged
 */
export default function Heatmap({ habit, dates, days = 84 }) {
  const completed = new Set(dates);
  const today = new Date();
  const todayStr = toDateStr(today);

  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = toDateStr(d);

    const done = completed.has(dateStr);
    const expected = isExpected(habit, dateStr);

    let cls = "heat-cell";
    if (done) cls += " heat-done";
    else if (dateStr === todayStr) cls += " heat-today";
    else if (expected) cls += " heat-missed";
    else cls += " heat-neutral";

    cells.push({ dateStr, cls });
  }

  return (
    <div>
      <div className="heatmap-grid">
        {cells.map((c) => (
          <div key={c.dateStr} className={c.cls} title={c.dateStr} />
        ))}
      </div>
      <div className="heat-legend">
        <span className="heat-cell heat-done" /> Completed
        <span className="heat-cell heat-missed" /> Missed
        <span className="heat-cell heat-neutral" /> Not scheduled
        <span className="heat-cell heat-today" /> Today
      </div>
    </div>
  );
}
