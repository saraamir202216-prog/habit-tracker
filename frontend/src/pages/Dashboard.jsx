import { useEffect, useState } from "react";
import api from "../api/axios";
import HabitCard from "../components/HabitCard.jsx";
import HabitForm from "../components/HabitForm.jsx";

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

export default function Dashboard() {
  const [habits, setHabits] = useState([]);
  const [doneMap, setDoneMap] = useState({}); // habitId -> boolean (done today)
  const [weekMap, setWeekMap] = useState({}); // habitId -> boolean[7] (last 7 days)
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loadHabits() {
    setLoading(true);
    try {
      const res = await api.get("/habits");
      setHabits(res.data.habits);

      const today = todayStr();
      const last7 = lastNDays(7);

      const entries = await Promise.all(
        res.data.habits.map(async (h) => {
          const logRes = await api.get(`/habits/${h._id}/logs`);
          const dates = new Set(logRes.data.dates);
          return {
            id: h._id,
            doneToday: dates.has(today),
            week: last7.map((d) => dates.has(d)),
          };
        })
      );

      setDoneMap(Object.fromEntries(entries.map((e) => [e.id, e.doneToday])));
      setWeekMap(Object.fromEntries(entries.map((e) => [e.id, e.week])));
    } catch (err) {
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
      setError(err.response?.data?.message || "Failed to create habit");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleToday(habit) {
    const today = todayStr();
    const isDone = doneMap[habit._id];
    try {
      if (isDone) {
        await api.delete(`/habits/${habit._id}/logs/${today}`);
      } else {
        await api.post(`/habits/${habit._id}/logs`, { date: today });
      }
      setDoneMap((prev) => ({ ...prev, [habit._id]: !isDone }));
      await loadHabits(); // refresh streaks
    } catch (err) {
      setError("Failed to update today's log");
    }
  }

  async function handleDelete(habit) {
    if (!confirm(`Delete "${habit.name}"? This also removes its history.`)) return;
    try {
      await api.delete(`/habits/${habit._id}`);
      await loadHabits();
    } catch (err) {
      setError("Failed to delete habit");
    }
  }

  const totalHabits = habits.length;
  const activeStreaks = habits.filter((h) => h.current_streak > 0).length;
  const weekCells = Object.values(weekMap).flat();
  const weekPercent = weekCells.length
    ? Math.round((weekCells.filter(Boolean).length / weekCells.length) * 100)
    : 0;

  return (
    <div>
      <div className="page-header">
        <h1>Your habits</h1>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Close" : "+ New habit"}
        </button>
      </div>

      {!loading && habits.length > 0 && (
        <div className="stats-strip">
          <div className="stat-block stat-block-purple">
            <span className="stat-value">{totalHabits}</span>
            <span className="stat-label">Habits tracked</span>
          </div>
          <div className="stat-block stat-block-lime">
            <span className="stat-value">{activeStreaks}</span>
            <span className="stat-label">Active streaks</span>
          </div>
          <div className="stat-block stat-block-coral">
            <span className="stat-value">{weekPercent}%</span>
            <span className="stat-label">This week</span>
          </div>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      {showForm && (
        <div className="card">
          <HabitForm onSubmit={handleCreate} busy={busy} />
        </div>
      )}

      {loading ? (
        <p className="page-loading">Loading...</p>
      ) : habits.length === 0 ? (
        <div className="empty-state-block">
          
          <h2>No habits yet</h2>
          <p>Create your first one below and start building a streak.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + New habit
          </button>
        </div>
      ) : (
        <div className="habit-list">
          {habits.map((h) => (
            <HabitCard
              key={h._id}
              habit={h}
              doneToday={!!doneMap[h._id]}
              week={weekMap[h._id] || []}
              onToggleToday={() => handleToggleToday(h)}
              onDelete={() => handleDelete(h)}
            />
          ))}
        </div>
      )}
    </div>
  );
}