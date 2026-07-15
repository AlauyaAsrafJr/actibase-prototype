import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";

import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPlayers from "./pages/admin/AdminPlayers";
import AdminSessions from "./pages/admin/AdminSessions";
import AdminReports from "./pages/admin/AdminReports";
import AdminArchive from "./pages/admin/AdminArchive";

import CoachDashboard from "./pages/coach/CoachDashboard";
import CoachRoster from "./pages/coach/CoachRoster";
import CoachSessions from "./pages/coach/CoachSessions";
import CoachAttendance from "./pages/coach/CoachAttendance";
import CoachActivities from "./pages/coach/CoachActivities";
import CoachEvaluations from "./pages/coach/CoachEvaluations";
import CoachReports from "./pages/coach/CoachReports";
import CoachProfile from "./pages/coach/CoachProfile";

import PlayerDashboard from "./pages/player/PlayerDashboard";
import PlayerAttendance from "./pages/player/PlayerAttendance";
import PlayerActivities from "./pages/player/PlayerActivities";
import PlayerEvaluations from "./pages/player/PlayerEvaluations";
import PlayerStats from "./pages/player/PlayerStats";
import PlayerProfile from "./pages/player/PlayerProfile";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute role="admin" />}>
            <Route element={<AppLayout role="admin" title="Admin" />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/players" element={<AdminPlayers />} />
              <Route path="/admin/sessions" element={<AdminSessions />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/archive" element={<AdminArchive />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute role="coach" />}>
            <Route element={<AppLayout role="coach" title="Coach" />}>
              <Route path="/coach" element={<CoachDashboard />} />
              <Route path="/coach/roster" element={<CoachRoster />} />
              <Route path="/coach/sessions" element={<CoachSessions />} />
              <Route path="/coach/sessions/:sessionId/attendance" element={<CoachAttendance />} />
              <Route path="/coach/activities" element={<CoachActivities />} />
              <Route path="/coach/evaluations" element={<CoachEvaluations />} />
              <Route path="/coach/reports" element={<CoachReports />} />
              <Route path="/coach/profile" element={<CoachProfile />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute role="player" />}>
            <Route element={<AppLayout role="player" title="Player" />}>
              <Route path="/player" element={<PlayerDashboard />} />
              <Route path="/player/attendance" element={<PlayerAttendance />} />
              <Route path="/player/activities" element={<PlayerActivities />} />
              <Route path="/player/evaluations" element={<PlayerEvaluations />} />
              <Route path="/player/stats" element={<PlayerStats />} />
              <Route path="/player/profile" element={<PlayerProfile />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
