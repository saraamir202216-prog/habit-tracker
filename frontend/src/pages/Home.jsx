import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/** Original illustration composition (a calendar card + a floating
 * streak badge) - intentionally simple/abstract shapes rather than a
 * copied character illustration, since that's someone else's artwork. */
function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 420 380"
      className="hero-illustration"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="230" cy="190" r="170" fill="var(--purple-tint)" />

      <g transform="translate(60,60)">
        <rect
          x="0"
          y="0"
          width="230"
          height="230"
          rx="22"
          fill="var(--surface)"
          stroke="var(--border)"
          strokeWidth="2"
        />

        <text
          x="20"
          y="38"
          fontFamily="Poppins"
          fontWeight="700"
          fontSize="16"
          fill="var(--ink)"
        >
          June
        </text>

        {Array.from({ length: 7 }).map((_, col) => (
          <text
            key={col}
            x={20 + col * 28}
            y="62"
            fontFamily="Inter"
            fontSize="10"
            fill="var(--ink-muted)"
            textAnchor="middle"
          >
            {["M", "T", "W", "T", "F", "S", "S"][col]}
          </text>
        ))}

        {Array.from({ length: 4 }).map((_, row) =>
          Array.from({ length: 7 }).map((_, col) => {
            const filled =
              (row * 7 + col) % 3 === 0 || (row + col) % 5 === 0;

            return (
              <rect
                key={`${row}-${col}`}
                x={14 + col * 28}
                y={76 + row * 28}
                width="18"
                height="18"
                rx="5"
                fill={filled ? "var(--lime)" : "var(--bg)"}
              />
            );
          })
        )}
      </g>

      <g transform="translate(255,205)">
        <rect
          x="0"
          y="0"
          width="130"
          height="90"
          rx="18"
          fill="var(--surface)"
          stroke="var(--border)"
          strokeWidth="2"
        />

        <text
          x="16"
          y="30"
          fontFamily="Inter"
          fontWeight="600"
          fontSize="12"
          fill="var(--ink-muted)"
        >
          Streak
        </text>

        <text
          x="16"
          y="60"
          fontFamily="Poppins"
          fontWeight="800"
          fontSize="26"
          fill="var(--ink)"
        >
          7 days
        </text>

        <circle
          cx="110"
          cy="20"
          r="16"
          fill="var(--pine, var(--lime))"
        />

        <path
          d="M103 20 L108 25 L118 13"
          stroke="white"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      <circle cx="70" cy="30" r="4" fill="var(--coral)" />
      <circle cx="380" cy="120" r="5" fill="var(--purple)" />
      <circle cx="360" cy="330" r="4" fill="var(--lime-dark)" />
    </svg>
  );
}

function CalendarHeatmapDemo() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const seed = [
    3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7,
    9, 3, 2, 3, 8, 4, 6, 2, 6, 4, 3, 3, 8, 3,
  ];

  return (
    <div className="calendar-demo">
      <div className="calendar-demo-header">
        <span>May</span>
        <strong>June</strong>
        <span>Jul</span>
      </div>

      <div className="calendar-demo-grid">
        {days.map((d) => (
          <span className="calendar-demo-daylabel" key={d}>
            {d}
          </span>
        ))}

        {seed.map((v, i) => {
          const level = v % 5;

          return (
            <span
              key={i}
              className={`calendar-demo-cell level-${level}`}
            />
          );
        })}
      </div>

      <div className="calendar-demo-legend">
        <span>Less</span>
        <span className="calendar-demo-cell level-0" />
        <span className="calendar-demo-cell level-1" />
        <span className="calendar-demo-cell level-2" />
        <span className="calendar-demo-cell level-3" />
        <span className="calendar-demo-cell level-4" />
        <span>More</span>
      </div>
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="home-page">
      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-copy anim-fade-up anim-delay-1">
          <h1 className="hero-heading">
            Build better habits,
            <br />
            <em>one day</em> at a time.
          </h1>

          <p className="home-tagline">
            Track habits with your own real-world schedule - daily,
            specific weekdays, or X-times-a-week - and see an honest
            streak that actually respects it.
          </p>

          {/* Shows only when the user is logged in */}
          {!loading && user && (
            <Link
              to="/dashboard"
              className="hero-dashboard-btn"
            >
              Go to Dashboard →
            </Link>
          )}
        </div>

        <div className="hero-art anim-fade-up anim-delay-2">
          <HeroIllustration />
        </div>
      </section>

      {/* FEATURES */}
      <section className="home-features">
        <Link
          to={user ? "/habits" : "/register"}
          className="home-feature anim-fade-up anim-delay-3"
        >
          <span className="home-feature-icon-wrap">
            <span className="home-feature-icon">📅</span>
          </span>

          <div className="home-feature-body">
            <h3>Flexible schedules</h3>
            <p>
              Daily, specific weekdays, or a weekly target - you choose
              what works.
            </p>
          </div>

          <span
            className="home-feature-chevron"
            aria-hidden="true"
          >
            &rsaquo;
          </span>
        </Link>

        <Link
          to={user ? "/habits" : "/register"}
          className="home-feature anim-fade-up anim-delay-4"
        >
          <span className="home-feature-icon-wrap home-feature-icon-wrap-lime">
            <span className="home-feature-icon">🎯</span>
          </span>

          <div className="home-feature-body">
            <h3>Honest streaks</h3>
            <p>
              Only days your habit is actually expected on count toward
              your streak.
            </p>
          </div>

          <span
            className="home-feature-chevron"
            aria-hidden="true"
          >
            &rsaquo;
          </span>
        </Link>

        <Link
          to={user ? "/habits" : "/register"}
          className="home-feature anim-fade-up anim-delay-5"
        >
          <span className="home-feature-icon-wrap home-feature-icon-wrap-coral">
            <span className="home-feature-icon">📊</span>
          </span>

          <div className="home-feature-body">
            <h3>Visual history</h3>
            <p>
              A simple heatmap shows your completion history at a glance.
            </p>
          </div>

          <span
            className="home-feature-chevron"
            aria-hidden="true"
          >
            &rsaquo;
          </span>
        </Link>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-it-works-section anim-fade-up anim-delay-6">
        <div className="how-it-works-steps">
          <h2 className="how-it-works-title">How it works</h2>

          <div className="how-steps-line">
            <div className="how-step-row">
              <span className="how-step-num">1</span>
              <span className="how-step-icon">＋</span>

              <div>
                <h3>Create a habit</h3>
                <p>
                  Give it a name and pick a schedule - every day,
                  specific weekdays, or X times a week.
                </p>
              </div>
            </div>

            <div className="how-step-row">
              <span className="how-step-num how-step-num-lime">
                2
              </span>

              <span className="how-step-icon how-step-icon-lime">
                ✓
              </span>

              <div>
                <h3>Mark it done</h3>
                <p>
                  Tap "Mark today done" on the dashboard, or fill in
                  past days from the habit's own page.
                </p>
              </div>
            </div>

            <div className="how-step-row">
              <span className="how-step-num how-step-num-coral">
                3
              </span>

              <span className="how-step-icon how-step-icon-coral">
                ↗
              </span>

              <div>
                <h3>Watch your streak grow</h3>
                <p>
                  Your current and longest streaks update automatically,
                  along with a full history heatmap.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="how-it-works-visual">
          <CalendarHeatmapDemo />
        </div>
      </section>
    </div>
  );
}