import { NavLink } from "react-router-dom";

const LINKS = [
  { to: "/dashboard", label: "Overview", end: true },
  { to: "/habits", label: "Habits"},
  { to: "/calendar", label: "Calendar"},
  { to: "/analytics", label: "Analytics" },
 
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-icon">🔥</span>
        <span>Habit Tracker</span>
      </div>
      <nav className="sidebar-nav">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
            }
          >
            <span className="sidebar-link-icon">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}