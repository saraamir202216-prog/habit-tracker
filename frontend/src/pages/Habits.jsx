import { useEffect, useState } from "react";
import api from "../api/axios";
import HabitCard from "../components/HabitCard.jsx";
import HabitForm from "../components/HabitForm.jsx";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isScheduledDay(habit, dateStr) {
  if (habit.schedule_type !== "specific_days") {
    return true;
  }

  const dow = new Date(
    dateStr + "T00:00:00.000Z"
  ).getUTCDay();

  return (habit.days_of_week || []).includes(dow);
}

function lastNDays(n) {
  const out = [];
  const today = new Date();

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);

    d.setUTCDate(d.getUTCDate() - i);

    out.push(
      d.toISOString().slice(0, 10)
    );
  }

  return out;
}

export default function Habits() {
  const [habits, setHabits] = useState([]);
  const [doneMap, setDoneMap] = useState({});
  const [weekMap, setWeekMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [togglingHabitId, setTogglingHabitId] =
    useState(null);
  const [error, setError] = useState("");

  /*
   * Load habits.
   *
   * IMPORTANT:
   * We only make ONE request here.
   *
   * The backend already sends logDates with
   * every habit, so we don't need:
   *
   * /habits/1/logs
   * /habits/2/logs
   * /habits/3/logs
   * etc.
   */
  async function loadHabits() {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/habits");

      const loadedHabits =
        res.data.habits || [];

      setHabits(loadedHabits);

      const today = todayStr();
      const last7 = lastNDays(7);

      /*
       * Build today's completion and weekly
       * completion from the logDates already
       * returned by the backend.
       */
      const entries = loadedHabits.map(
        (habit) => {
          const dates = new Set(
            habit.logDates || []
          );

          return {
            id: habit._id,

            doneToday:
              dates.has(today),

            week: last7.map(
              (date) => dates.has(date)
            ),
          };
        }
      );

      setDoneMap(
        Object.fromEntries(
          entries.map((entry) => [
            entry.id,
            entry.doneToday,
          ])
        )
      );

      setWeekMap(
        Object.fromEntries(
          entries.map((entry) => [
            entry.id,
            entry.week,
          ])
        )
      );
    } catch (err) {
      console.error(
        "Failed to load habits:",
        err
      );

      setError(
        "Failed to load habits"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHabits();
  }, []);

  /*
   * Create habit.
   *
   * Instead of creating the habit and then
   * requesting the entire habits list again,
   * we add the newly-created habit directly
   * to the existing state.
   *
   * This saves another API request.
   */
  async function handleCreate(payload) {
    setBusy(true);
    setError("");

    try {
      const res = await api.post(
        "/habits",
        payload
      );

      const newHabit = res.data.habit;

      setHabits((current) => [
        newHabit,
        ...current,
      ]);

      setDoneMap((current) => ({
        ...current,
        [newHabit._id]: false,
      }));

      setWeekMap((current) => ({
        ...current,
        [newHabit._id]: Array(7).fill(false),
      }));

      setShowForm(false);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to create habit"
      );
    } finally {
      setBusy(false);
    }
  }

  /*
   * Mark / unmark today's habit.
   *
   * Only ONE request is made when the user
   * clicks the button.
   */
  async function handleToggleToday(habit) {
    const isDone =
      !!doneMap[habit._id];

    const today = todayStr();

    setTogglingHabitId(habit._id);
    setError("");

    try {
      if (isDone) {
        /*
         * Remove today's log
         */
        const res = await api.delete(
          `/habits/${habit._id}/logs/${today}`
        );

        /*
         * Update only this habit.
         */
        setHabits((current) =>
          current.map((item) =>
            item._id === habit._id
              ? res.data.habit
              : item
          )
        );

        setDoneMap((current) => ({
          ...current,
          [habit._id]: false,
        }));

        setWeekMap((current) => ({
          ...current,
          [habit._id]: (
            current[habit._id] || []
          ).map(
            (done, index) =>
              lastNDays(7)[index] === today
                ? false
                : done
          ),
        }));
      } else {
        /*
         * Add today's log
         */
        const res = await api.post(
          `/habits/${habit._id}/logs`,
          {}
        );

        /*
         * Update only this habit.
         */
        setHabits((current) =>
          current.map((item) =>
            item._id === habit._id
              ? res.data.habit
              : item
          )
        );

        setDoneMap((current) => ({
          ...current,
          [habit._id]: true,
        }));

        setWeekMap((current) => ({
          ...current,
          [habit._id]: (
            current[habit._id] || []
          ).map(
            (done, index) =>
              lastNDays(7)[index] === today
                ? true
                : done
          ),
        }));
      }
    } catch (err) {
      console.error(
        "Failed to update habit:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to update today's log"
      );
    } finally {
      setTogglingHabitId(null);
    }
  }

  /*
   * Delete habit.
   *
   * Instead of deleting and then calling
   * loadHabits() again, simply remove it
   * from the local state.
   */
  async function handleDelete(habit) {
    if (
      !confirm(
        `Delete "${habit.name}"? This also removes its history.`
      )
    ) {
      return;
    }

    setError("");

    try {
      await api.delete(
        `/habits/${habit._id}`
      );

      /*
       * Remove habit locally.
       */
      setHabits((current) =>
        current.filter(
          (item) =>
            item._id !== habit._id
        )
      );

      /*
       * Remove its completion data.
       */
      setDoneMap((current) => {
        const updated = {
          ...current,
        };

        delete updated[habit._id];

        return updated;
      });

      setWeekMap((current) => {
        const updated = {
          ...current,
        };

        delete updated[habit._id];

        return updated;
      });
    } catch (err) {
      console.error(
        "Failed to delete habit:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to delete habit"
      );
    }
  }

  const totalHabits =
    habits.length;

  const activeStreaks =
    habits.filter(
      (habit) =>
        habit.current_streak > 0
    ).length;

  const weekCells =
    Object.values(
      weekMap
    ).flat();

  const weekPercent =
    weekCells.length
      ? Math.round(
          (weekCells.filter(Boolean)
            .length /
            weekCells.length) *
            100
        )
      : 0;

  const today = todayStr();

  const weekDates = lastNDays(7);

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <h1>All habits</h1>

        <button
          className="btn btn-primary"
          onClick={() =>
            setShowForm((s) => !s)
          }
        >
          {showForm
            ? "Close"
            : "+ New habit"}
        </button>
      </div>

      {/* SUMMARY STATS */}
      {!loading &&
        habits.length > 0 && (
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
        )}

      {/* ERROR */}
      {error && (
        <p className="form-error">
          {error}
        </p>
      )}

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
        <p className="page-loading">
          Loading...
        </p>
      ) : habits.length === 0 ? (
        /* EMPTY STATE */
        <div className="empty-state-block">
          <h2>No habits yet</h2>

          <p>
            Create your first one below
            and start building a streak.
          </p>

          <button
            className="btn btn-primary"
            onClick={() =>
              setShowForm(true)
            }
          >
            + New habit
          </button>
        </div>
      ) : (
        /* HABIT LIST */
        <div className="habit-list">
          {habits.map((habit) => (
            <HabitCard
              key={habit._id}
              habit={habit}
              doneToday={
                !!doneMap[habit._id]
              }
              week={
                weekMap[habit._id] || []
              }
              weekDates={weekDates}
              isScheduledToday={isScheduledDay(
                habit,
                today
              )}
              isToggling={
                togglingHabitId ===
                habit._id
              }
              onToggleToday={() =>
                handleToggleToday(
                  habit
                )
              }
              onDelete={() =>
                handleDelete(
                  habit
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}