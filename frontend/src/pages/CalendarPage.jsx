import { useEffect, useState } from "react";
import api from "../api/axios";

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return toDateStr(new Date());
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const firstWeekday = firstOfMonth.getUTCDay();
  const leadingBlanks = firstWeekday === 0 ? 6 : firstWeekday - 1;

  const start = new Date(firstOfMonth);
  start.setUTCDate(start.getUTCDate() - leadingBlanks);

  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    cells.push({
      dateStr: toDateStr(d),
      day: d.getUTCDate(),
      inMonth: d.getUTCMonth() === month,
    });
  }
  return cells;
}

export default function CalendarPage() {
  const [habits, setHabits] = useState([]);
  const [countsByDate, setCountsByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth());

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await api.get("/habits");
        setHabits(res.data.habits);

        const entries = await Promise.all(
          res.data.habits.map((h) => api.get(`/habits/${h._id}/logs`))
        );
        const counts = {};
        entries.forEach((logRes) => {
          logRes.data.dates.forEach((dateStr) => {
            counts[dateStr] = (counts[dateStr] || 0) + 1;
          });
        });
        setCountsByDate(counts);
      } catch (err) {
        setError("Failed to load calendar data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  const cells = buildMonthGrid(year, month);
  const today = todayStr();
  const maxCount = Math.max(1, habits.length);

  function levelFor(count) {
    if (count === 0) return 0;
    const ratio = count / maxCount;
    if (ratio >= 0.75) return 4;
    if (ratio >= 0.5) return 3;
    if (ratio >= 0.25) return 2;
    return 1;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Calendar</h1>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="card">
        <div className="calendar-page-header">
          <button className="btn btn-ghost" onClick={prevMonth}>&larr;</button>
          <h2>{MONTH_NAMES[month]} {year}</h2>
          <button className="btn btn-ghost" onClick={nextMonth}>&rarr;</button>
        </div>

        {loading ? (
          <p className="page-loading">Loading...</p>
        ) : (
          <>
            <div className="calendar-page-grid">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span className="calendar-page-daylabel" key={d}>{d}</span>
              ))}
              {cells.map((cell) => {
                const count = countsByDate[cell.dateStr] || 0;
                const level = levelFor(count);
                return (
                  <div
                    key={cell.dateStr}
                    className={`calendar-page-cell level-${level} ${
                      cell.inMonth ? "" : "calendar-page-cell-out"
                    } ${cell.dateStr === today ? "calendar-page-cell-today" : ""}`}
                    title={count > 0 ? `${cell.dateStr}: ${count} habit${count === 1 ? "" : "s"} completed` : cell.dateStr}
                  >
                    <span className="calendar-page-daynum">{cell.day}</span>
                  </div>
                );
              })}
            </div>
            <div className="calendar-demo-legend" style={{ marginTop: 14 }}>
              <span>Less</span>
              <span className="calendar-demo-cell level-0" />
              <span className="calendar-demo-cell level-1" />
              <span className="calendar-demo-cell level-2" />
              <span className="calendar-demo-cell level-3" />
              <span className="calendar-demo-cell level-4" />
              <span>More</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}