export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <h3>Habit Tracker</h3>
        <p>Build better habits, one day at a time.</p>

        <div className="footer-links">
          <a href="/">Home</a>
          <a href="/dashboard">Overview</a>
          <a href="/habits">Habits</a>
          <a href="/analytics">Analytics</a>
        </div>

        <p className="copyright">
          © 2026 Habit Tracker. All rights reserved.
        </p>
      </div>
    </footer>
  );
}