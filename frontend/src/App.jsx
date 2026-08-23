import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import AuthenticatedLayout from "./components/AuthenticatedLayout.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Habits from "./pages/Habits.jsx";
import HabitDetail from "./pages/HabitDetail.jsx";
import CalendarPage from "./pages/CalendarPage.jsx";
import Analytics from "./pages/Analytics.jsx";


export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<main className="container"><Home /></main>} />
        <Route path="/login" element={<main className="container"><Login /></main>} />
        <Route path="/register" element={<main className="container"><Register /></main>} />

        <Route
          element={
            <PrivateRoute>
              <AuthenticatedLayout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/habits/:id" element={<HabitDetail />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/analytics" element={<Analytics />} />
         
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}