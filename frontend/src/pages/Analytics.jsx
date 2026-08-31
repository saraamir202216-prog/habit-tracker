import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
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

function scheduleLabel(habit) {
  if (habit.schedule_type === "daily") {
    return "Every day";
  }

  if (habit.schedule_type === "specific_days") {
    const names = [
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ];

    return (habit.days_of_week || [])
      .map((d) => names[d])
      .join("/");
  }

  return `${habit.target_count}x/week`;
}

export default function Analytics() {
  const [habits, setHabits] = useState([]);
  const [logsByHabit, setLogsByHabit] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        // Get habits
        const habitsRes = await api.get("/habits");

        const loadedHabits =
          habitsRes.data.habits || [];

        setHabits(loadedHabits);

        // Get ALL logs in one request
        const logsRes =
          await api.get("/habits/all-logs");

        const groupedLogs = {};

        // Make sure every habit has an array
        loadedHabits.forEach((habit) => {
          groupedLogs[habit._id] = [];
        });

        // Group logs by habit
        (logsRes.data.logs || []).forEach((log) => {
          if (!groupedLogs[log.habit_id]) {
            groupedLogs[log.habit_id] = [];
          }

          groupedLogs[log.habit_id].push(
            log.completed_date
          );
        });

        setLogsByHabit(groupedLogs);
      } catch (err) {
        console.error(err);
        setError("Failed to load analytics data");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <p className="page-loading">
        Loading...
      </p>
    );
  }

  if (error) {
    return (
      <p className="form-error">
        {error}
      </p>
    );
  }

  if (habits.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h1>Analytics</h1>
        </div>

        <div className="empty-state-block">
          <h2>Nothing to analyze yet</h2>

          <p>
            Create a habit and log a few days -
            analytics will show up here automatically.
          </p>

          <Link
            to="/habits"
            className="btn btn-primary"
          >
            + New habit
          </Link>
        </div>
      </div>
    );
  }

  // All completion dates from all habits
  const allDates = Object.values(logsByHabit).flat();

  // Total number of completions
  const totalCompletions = allDates.length;

  // Number of habits that currently have a streak
  const activeStreaks = habits.filter(
    (h) => h.current_streak > 0
  ).length;

  // Find habit with the longest streak
  const best = habits.reduce(
    (a, b) =>
      b.longest_streak >
      (a?.longest_streak || 0)
        ? b
        : a,
    null
  );

  // Habits that need attention
  const needsAttention = habits.filter(
    (h) => h.pendingMissedDate
  );

  // Last 14 days
  const last14 = lastNDays(14);

  // Count completions for each date
  const countsByDate = {};

  for (const dateStr of allDates) {
    countsByDate[dateStr] =
      (countsByDate[dateStr] || 0) + 1;
  }

  // Highest completion count in the last 14 days
  const maxCount = Math.max(
    1,
    ...last14.map(
      (d) => countsByDate[d] || 0
    )
  );

  // Sort habits by current streak
  const sortedHabits = [...habits].sort(
    (a, b) =>
      b.current_streak -
      a.current_streak
  );

  return (
    <div>
      {/* PAGE HEADER */}
      <div className="page-header">
        <h1>Analytics</h1>
      </div>

      {/* SUMMARY STATS */}
      <div className="stats-strip">
        <div className="stat-block stat-block-purple">
          <span className="stat-value">
            {totalCompletions}
          </span>

          <span className="stat-label">
            Total check-ins
          </span>
        </div>

        <div className="stat-block stat-block-lime">
          <span className="stat-value">
            {activeStreaks}/{habits.length}
          </span>

          <span className="stat-label">
            Active streaks
          </span>
        </div>

        <div className="stat-block stat-block-coral">
          <span className="stat-value">
            {best
              ? best.longest_streak
              : 0}
          </span>

          <span className="stat-label">
            Longest streak ever
          </span>
        </div>
      </div>

      {/* GRACE PERIOD */}
      {needsAttention.length > 0 && (
        <div className="grace-banner">
          ⏳{" "}
          {needsAttention.length} habit
          {needsAttention.length > 1
            ? "s"
            : ""}{" "}
          in grace period right now:{" "}
          {needsAttention
            .map((h) => h.name)
            .join(", ")}
        </div>
      )}

      {/* LAST 14 DAYS */}
      <div className="card">
        <h2>Last 14 days</h2>

        <div className="analytics-bars">
          {last14.map((dateStr) => {
            const count =
              countsByDate[dateStr] || 0;

            const heightPct = Math.round(
              (count / maxCount) * 100
            );

            return (
              <div
                className="analytics-bar-col"
                key={dateStr}
              >
                <div className="analytics-bar-track">
                  <div
                    className="analytics-bar-fill"
                    style={{
                      height: `${Math.max(
                        heightPct,
                        count > 0 ? 8 : 0
                      )}%`,
                    }}
                    title={`${dateStr}: ${count} completion${
                      count === 1
                        ? ""
                        : "s"
                    }`}
                  />
                </div>

                <span className="analytics-bar-label">
                  {dateStr.slice(8)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* BY HABIT */}
      <div className="card">
        <h2>By habit</h2>

        <div className="analytics-table">
          <div className="analytics-table-row analytics-table-head">
            <span>Habit</span>
            <span>Schedule</span>
            <span>Current</span>
            <span>Best</span>
            <span>Total</span>
          </div>

          {sortedHabits.map((h) => (
            <div
              className="analytics-table-row"
              key={h._id}
            >
              <span className="analytics-table-name">
                <Link
                  to={`/habits/${h._id}`}
                >
                  {h.name}
                </Link>
              </span>

              <span>
                {scheduleLabel(h)}
              </span>

              <span>
                🔥 {h.current_streak}
              </span>

              <span>
                🏆 {h.longest_streak}
              </span>

              <span>
                {(logsByHabit[h._id] || [])
                  .length}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}