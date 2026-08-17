import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        🔥 Habit Tracker
      </Link>
      {user && (
        <div className="navbar-right">
          <Link to="/dashboard" className="btn btn-ghost">
            Dashboard
          </Link>
          <span className="navbar-user">Hi, {user.name}</span>
          <button className="btn btn-ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      )}
    </header>
  );
}
