import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import Heatmap from "../components/Heatmap.jsx";
import HabitForm from "../components/HabitForm.jsx";

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
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
    try {
      const [habitRes, logsRes] = await Promise.all([
        api.get(`/habits/${id}`),
        api.get(`/habits/${id}/logs`),
      ]);
      setHabit(habitRes.data.habit);
      setDates(logsRes.data.dates);
    } catch (err) {
      setError("Failed to load habit");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggleDate(dateStr) {
    const isDone = dates.includes(dateStr);
    try {
      if (isDone) {
        await api.delete(`/habits/${id}/logs/${dateStr}`);
      } else {
        await api.post(`/habits/${id}/logs`, { date: dateStr });
      }
      await load();
    } catch (err) {
      setError("Failed to update that day");
    }
  }

  async function handleUpdate(payload) {
    setBusy(true);
    setError("");
    try {
      await api.put(`/habits/${id}`, payload);
      setEditing(false);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update habit");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${habit.name}"? This also removes its history.`)) return;
    await api.delete(`/habits/${id}`);
    navigate("/dashboard");
  }

  if (loading) return <p className="page-loading">Loading...</p>;
  if (!habit) return <p className="empty-state">Habit not found.</p>;

  const recentDays = lastNDays(7);

  return (
    <div>
      <button className="btn btn-ghost" onClick={() => navigate("/dashboard")}>
        ← Back
      </button>

      <div className="page-header">
        <h1>{habit.name}</h1>
        <div className="form-actions">
          <button className="btn btn-outline" onClick={() => setEditing((e) => !e)}>
            {editing ? "Cancel edit" : "Edit"}
          </button>
          <button className="btn btn-danger-ghost" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      {editing ? (
        <div className="card">
          <HabitForm initial={habit} onSubmit={handleUpdate} busy={busy} />
        </div>
      ) : (
        <>
          <div className="streak-summary">
            <div className="streak-pill">
              🔥 {habit.current_streak} <span>current streak</span>
            </div>
            <div className="streak-pill streak-pill-muted">
              🏆 {habit.longest_streak} <span>longest ever</span>
            </div>
          </div>

          <div className="card">
            <h2>Recent days</h2>
            <div className="recent-days">
              {recentDays.map((d) => (
                <button
                  key={d}
                  className={`day-toggle ${dates.includes(d) ? "active" : ""}`}
                  onClick={() => toggleDate(d)}
                >
                  <span className="day-toggle-date">{d.slice(5)}</span>
                  <span className="day-toggle-check">
                    {dates.includes(d) ? "✓" : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>History</h2>
            <Heatmap habit={habit} dates={dates} />
          </div>
        </>
      )}
    </div>
  );
}
