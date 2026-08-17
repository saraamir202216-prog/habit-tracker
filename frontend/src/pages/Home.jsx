import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="home-hero">
      <div className="hero-stamp-wrap" aria-hidden="true">
        
      </div>

      <h1>Welcome to Habit Tracker</h1>
      <p className="home-tagline">
        Track habits with your own real-world schedule — daily, specific
        weekdays, or X-times-a-week — and see an honest streak that
        actually respects it.
      </p>

      {!loading && (
        <div className="home-actions">
          {user ? (
            <Link to="/dashboard" className="btn btn-primary">
              Go to your dashboard
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary">
                Create an account
              </Link>
              <Link to="/login" className="btn btn-outline">
                Log in
              </Link>
            </>
          )}
        </div>
      )}

      <img
        src="/image/mascot.png"
        alt="Habit tracker mascot"
        className="home-hero-image"
      />

      <div className="home-features">
        <div className="home-feature">
          <span className="home-feature-icon">📅</span>
          <h3>Flexible schedules</h3>
          <p>Daily, specific weekdays, or a weekly target — your choice per habit.</p>
        </div>
        <div className="home-feature">
          <span className="home-feature-icon">🔥</span>
          <h3>Honest streaks</h3>
          <p>Only days your habit is actually expected on count toward your streak.</p>
        </div>
        <div className="home-feature">
          <span className="home-feature-icon">🗓️</span>
          <h3>Visual history</h3>
          <p>A simple heatmap shows your completion history at a glance.</p>
        </div>
      </div>
    </div>
  );
}