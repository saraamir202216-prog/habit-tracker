import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import Heatmap from "../components/Heatmap.jsx";
import HabitForm from "../components/HabitForm.jsx";

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return toDateStr(new Date());
}

function addDaysStr(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + n);
  return toDateStr(d);
}

function lastNDays(n) {
  const out = [];
  const today = new Date();

  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(toDateStr(d));
  }

  return out;
}

function formatFriendly(dateStr) {
  const d = new Date(dateStr + "T00:00:00.000Z");

  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
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

/*
 * Calculate streak from actual completed dates.
 *
 * A missed day can have a 1-day grace period,
 * but an uncompleted missed day is NEVER counted
 * as part of the streak.
 */
function calculateStreaks(habit, completedDates) {
  const completed = new Set(
    (completedDates || []).filter(Boolean)
  );

  const today = todayStr();

  /*
   * Start from today and go backwards.
   *
   * If today is not completed, we don't count today,
   * because the user has not completed it yet.
   */
  let currentStreak = 0;
  let checkDate = today;

  if (
    !isScheduledDay(habit, checkDate) ||
    !completed.has(checkDate)
  ) {
    checkDate = addDaysStr(checkDate, -1);
  }

  while (true) {
    /*
     * Skip days that are not scheduled.
     */
    if (!isScheduledDay(habit, checkDate)) {
      checkDate = addDaysStr(checkDate, -1);
      continue;
    }

    /*
     * A scheduled day without a completion breaks
     * the current streak.
     */
    if (!completed.has(checkDate)) {
      break;
    }

    currentStreak += 1;
    checkDate = addDaysStr(checkDate, -1);
  }

  /*
   * Calculate longest streak using only actual
   * completed scheduled days.
   */
  const sortedDates = Array.from(completed).sort();

  let longestStreak = 0;
  let runningStreak = 0;
  let previousDate = null;

  for (const date of sortedDates) {
    if (!isScheduledDay(habit, date)) {
      continue;
    }

    if (
      previousDate &&
      areConsecutiveScheduledDays(
        habit,
        previousDate,
        date
      )
    ) {
      runningStreak += 1;
    } else {
      runningStreak = 1;
    }

    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }

    previousDate = date;
  }

  return {
    currentStreak,
    longestStreak,
  };
}

function areConsecutiveScheduledDays(
  habit,
  previousDate,
  currentDate
) {
  let date = addDaysStr(previousDate, 1);

  while (date < currentDate) {
    if (isScheduledDay(habit, date)) {
      return false;
    }

    date = addDaysStr(date, 1);
  }

  return true;
}

export default function HabitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [habit, setHabit] = useState(null);
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const [habitRes, logsRes] = await Promise.all([
        api.get(`/habits/${id}`),
        api.get(`/habits/${id}/logs`),
      ]);

      const loadedHabit = habitRes.data.habit;
      const loadedDates = logsRes.data.dates || [];

      setHabit(loadedHabit);
      setDates(loadedDates);
    } catch (err) {
      console.error(
        "Failed to load habit:",
        err
      );

      setError("Failed to load habit");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function toggleDate(dateStr) {
    const isDone = dates.includes(dateStr);

    const graceDeadline = addDaysStr(
      dateStr,
      1
    );

    const isLocked =
      dateStr < todayStr() &&
      !isDone &&
      todayStr() > graceDeadline;

    if (isLocked) {
      return;
    }

    try {
      if (isDone) {
        await api.delete(
          `/habits/${id}/logs/${dateStr}`
        );
      } else {
        await api.post(
          `/habits/${id}/logs`,
          {
            date: dateStr,
          }
        );
      }

      await load();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to update that day"
      );
    }
  }

  async function handleUpdate(payload) {
    setBusy(true);
    setError("");

    try {
      await api.put(
        `/habits/${id}`,
        payload
      );

      setEditing(false);

      await load();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to update habit"
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        `Delete "${habit.name}"? This also removes its history.`
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `/habits/${id}`
      );

      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to delete habit"
      );
    }
  }

  if (loading) {
    return (
      <p className="page-loading">
        Loading...
      </p>
    );
  }

  if (!habit) {
    return (
      <p className="empty-state">
        Habit not found.
      </p>
    );
  }

  const recentDays = lastNDays(7);

  /*
   * Calculate streak from actual logs.
   */
  const {
    currentStreak,
    longestStreak,
  } = calculateStreaks(
    habit,
    dates
  );

  const showBrokenMessage =
    habit.lastBrokenDate &&
    addDaysStr(
      habit.lastBrokenDate,
      2
    ) === todayStr();

  return (
    <div>
      <button
        className="btn btn-ghost"
        onClick={() =>
          navigate("/dashboard")
        }
      >
        ← Back
      </button>

      <div className="page-header">
        <h1>{habit.name}</h1>

        <div className="form-actions">
          <button
            className="btn btn-outline"
            onClick={() =>
              setEditing((e) => !e)
            }
          >
            {editing
              ? "Cancel edit"
              : "Edit"}
          </button>

          <button
            className="btn btn-danger-ghost"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      </div>

      {error && (
        <p className="form-error">
          {error}
        </p>
      )}

      {editing ? (
        <div className="card">
          <HabitForm
            initial={habit}
            onSubmit={handleUpdate}
            busy={busy}
          />
        </div>
      ) : (
        <>
          {habit.pendingMissedDate && (
            <div className="grace-banner">
              ⏳ You missed{" "}
              <strong>
                {formatFriendly(
                  habit.pendingMissedDate
                )}
              </strong>
              . Mark it below before the day ends
              to keep your streak.
            </div>
          )}

          {showBrokenMessage && (
            <div className="broken-banner">
              Streak broken — you missed{" "}
              <strong>
                {formatFriendly(
                  habit.lastBrokenDate
                )}
              </strong>{" "}
              and didn't catch up in time.
            </div>
          )}

          <div className="streak-summary">
            <div className="streak-pill">
              🔥 {currentStreak}{" "}
              <span>current streak</span>
            </div>

            <div className="streak-pill streak-pill-muted">
              🏆 {longestStreak}{" "}
              <span>longest ever</span>
            </div>
          </div>

          <div className="card">
            <h2>Recent days</h2>

            <div className="recent-days">
              {recentDays.map((d) => {
                const isDone =
                  dates.includes(d);

                const graceDeadline =
                  addDaysStr(d, 1);

                const isPending =
                  d ===
                  habit.pendingMissedDate;

                const isLocked =
                  d < todayStr() &&
                  !isDone &&
                  todayStr() >
                    graceDeadline;

                return (
                  <button
                    key={d}
                    className={`day-toggle ${
                      isDone
                        ? "active"
                        : ""
                    } ${
                      isLocked
                        ? "locked"
                        : ""
                    } ${
                      isPending
                        ? "pending"
                        : ""
                    }`}
                    onClick={() =>
                      toggleDate(d)
                    }
                    disabled={isLocked}
                    title={
                      isLocked
                        ? "This day was missed and can no longer be marked"
                        : isPending
                        ? "Missed - mark it today to save your streak"
                        : ""
                    }
                  >
                    <span className="day-toggle-date">
                      {d.slice(5)}
                    </span>

                    <span className="day-toggle-check">
                      {isDone
                        ? "✓"
                        : isPending
                        ? "⏳"
                        : isLocked
                        ? "✕"
                        : ""}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="recent-days-note">
              A missed day gets a 1-day grace
              period (⏳) - after that it locks
              for good.
            </p>
          </div>

          <div className="card">
            <h2>History</h2>

            <Heatmap
              habit={habit}
              dates={dates}
            />
          </div>
        </>
      )}
    </div>
  );
}