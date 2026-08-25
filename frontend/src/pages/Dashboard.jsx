import { useEffect, useState } from "react";
import api from "../api/axios";
import HabitForm from "../components/HabitForm.jsx";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isScheduledDay(habit, dateStr) {
  if (habit.schedule_type !== "specific_days") return true;

  const dow = new Date(dateStr + "T00:00:00.000Z").getUTCDay();

  return (habit.days_of_week || []).includes(dow);
}

function lastNDays(n) {
  const out = [];
  const today = new Date();

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }

  return out;
}

export default function Dashboard() {
  const [habits, setHabits] = useState([]);
  const [doneMap, setDoneMap] = useState({});
  const [weekMap, setWeekMap] = useState({});
  const [weekDates, setWeekDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadHabits() {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/habits");

      const loadedHabits = res.data.habits || [];

      setHabits(loadedHabits);

      const today = todayStr();
      const last7 = lastNDays(7);

      setWeekDates(last7);

      const entries = await Promise.all(
        loadedHabits.map(async (h) => {
          const logRes = await api.get(`/habits/${h._id}/logs`);

          const dates = new Set(logRes.data.dates);

          return {
            id: h._id,
            doneToday: dates.has(today),
            week: last7.map((d) => dates.has(d)),
          };
        })
      );

      setDoneMap(
        Object.fromEntries(
          entries.map((entry) => [entry.id, entry.doneToday])
        )
      );

      setWeekMap(
        Object.fromEntries(
          entries.map((entry) => [entry.id, entry.week])
        )
      );
    } catch (err) {
      console.error(err);
      setError("Failed to load habits");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHabits();
  }, []);

  async function handleCreate(payload) {
    setBusy(true);
    setError("");

    try {
      await api.post("/habits", payload);

      setShowForm(false);

      await loadHabits();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to create habit"
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(habit) {
    if (
      !confirm(
        `Delete "${habit.name}"? This also removes its history.`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/habits/${habit._id}`);

      await loadHabits();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to delete habit"
      );
    }
  }

  const totalHabits = habits.length;

  const today = todayStr();

  /*
   * Habits that are scheduled for today
   * but have not been completed yet.
   */
  const pendingHabits = habits.filter((habit) => {
    const scheduledToday = isScheduledDay(habit, today);
    const completedToday = !!doneMap[habit._id];

    return scheduledToday && !completedToday;
  });

  const activeStreaks = habits.filter(
    (habit) => habit.current_streak > 0
  ).length;

  const weekCells = Object.values(weekMap).flat();

  const weekPercent = weekCells.length
    ? Math.round(
        (weekCells.filter(Boolean).length / weekCells.length) * 100
      )
    : 0;

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1>Overview</h1>

          <p className="page-subtitle">
            Here's a quick look at your habits and today's progress.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => setShowForm((s) => !s)}
        >
          {showForm ? "Close" : "+ New habit"}
        </button>
      </div>

      {/* ERROR */}
      {error && <p className="form-error">{error}</p>}

      {/* CREATE HABIT FORM */}
      {showForm && (
        <div className="card">
          <HabitForm
            onSubmit={handleCreate}
            busy={busy}
          />
        </div>
      )}

      {/* LOADING */}
      {loading ? (
        <p className="page-loading">Loading...</p>
      ) : habits.length === 0 ? (
        /* EMPTY STATE */
        <div className="empty-state-block">
          <h2>No habits yet</h2>

          <p>
            Create your first one below and start building a streak.
          </p>

          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            + New habit
          </button>
        </div>
      ) : (
        <>
          {/* SUMMARY STATS */}
          <div className="stats-strip">
            <div className="stat-block stat-block-purple">
              <span className="stat-value">
                {totalHabits}
              </span>

              <span className="stat-label">
                Habits tracked
              </span>
            </div>

            <div className="stat-block stat-block-lime">
              <span className="stat-value">
                {activeStreaks}
              </span>

              <span className="stat-label">
                Active streaks
              </span>
            </div>

            <div className="stat-block stat-block-coral">
              <span className="stat-value">
                {weekPercent}%
              </span>

              <span className="stat-label">
                This week
              </span>
            </div>
          </div>

          {/* OVERVIEW SUMMARY */}
          <div className="overview-summary">

            {/* ALL HABIT NAMES */}
            <div className="overview-section card">
              <h2>Your Habits</h2>

              <p>
                You currently have{" "}
                <strong>{totalHabits}</strong>{" "}
                {totalHabits === 1 ? "habit" : "habits"}.
              </p>

              <ul className="overview-habit-list">
                {habits.map((habit) => (
                  <li key={habit._id}>
                    {habit.name}
                  </li>
                ))}
              </ul>
            </div>

            {/* PENDING TODAY */}
            <div className="overview-section card">
              <h2>Pending Today</h2>

              {pendingHabits.length === 0 ? (
                <p className="overview-success">
                  All caught up! No pending habits for today.
                </p>
              ) : (
                <>
                  <p>
                    You still have{" "}
                    <strong>{pendingHabits.length}</strong>{" "}
                    {pendingHabits.length === 1
                      ? "habit"
                      : "habits"}{" "}
                    to complete today.
                  </p>

                  <ul className="overview-habit-list pending-list">
                    {pendingHabits.map((habit) => (
                      <li key={habit._id}>
                        {habit.name}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

          </div>
        </>
      )}
    </div>
  );
}