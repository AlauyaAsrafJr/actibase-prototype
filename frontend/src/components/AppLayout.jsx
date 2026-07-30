import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import Dropdown from "react-bootstrap/Dropdown";
import {
  Archive,
  BarChart3,
  Bell,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  Dumbbell,
  FileText,
  History,
  LayoutDashboard,
  TrendingUp,
  UserCircle,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useFetch } from "../hooks/useFetch";
import VarsityCrest from "./VarsityCrest";

const NAV_ITEMS = {
  admin: [
    { to: "/admin", label: "Dashboard", end: true, icon: LayoutDashboard },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/players", label: "Players", icon: UserRound },
    { to: "/admin/sessions", label: "Sessions", icon: CalendarDays },
    { to: "/admin/reports", label: "Reports", icon: FileText },
    { to: "/admin/statistics", label: "Statistics", icon: TrendingUp },
    { to: "/admin/login-history", label: "Login History", icon: History },
    { to: "/admin/archive", label: "Archive", icon: Archive },
  ],
  coach: [
    { to: "/coach", label: "Dashboard", end: true, icon: LayoutDashboard },
    { to: "/coach/roster", label: "Roster", icon: Users },
    { to: "/coach/sessions", label: "Sessions", icon: CalendarDays },
    { to: "/coach/evaluations", label: "Evaluations", icon: ClipboardCheck },
    { to: "/coach/reports", label: "Reports", icon: FileText },
    { to: "/coach/profile", label: "Profile", icon: UserCircle },
  ],
  player: [
    { to: "/player", label: "Dashboard", end: true, icon: LayoutDashboard },
    { to: "/player/attendance", label: "Attendance", icon: CalendarCheck },
    { to: "/player/activities", label: "Activities", icon: Dumbbell },
    { to: "/player/evaluations", label: "Evaluations", icon: ClipboardCheck },
    { to: "/player/stats", label: "Team Stats", icon: BarChart3 },
    { to: "/player/profile", label: "Profile", icon: UserCircle },
  ],
};

const ROLE_LABEL = { admin: "Administrator", coach: "Coach", player: "Player" };

function useNotifications(role) {
  const { data } = useFetch(`/${role}/dashboard`);
  if (!data) return { count: 0, items: [] };

  if (role === "admin") {
    const items = [];
    if (data.archived_records > 0) {
      items.push({ text: `${data.archived_records} archived record(s)`, to: "/admin/archive" });
    }
    return { count: 0, items };
  }

  if (role === "coach") {
    const items = [];
    if (data.pending_evaluations > 0) {
      items.push({ text: `${data.pending_evaluations} evaluation(s) pending`, to: "/coach/evaluations" });
    }
    if (data.upcoming_training > 0) {
      items.push({ text: `${data.upcoming_training} upcoming session(s)`, to: "/coach/sessions" });
    }
    return { count: data.pending_evaluations || 0, items };
  }

  // player
  const items = [];
  if (data.upcoming_sessions > 0) {
    items.push({ text: `${data.upcoming_sessions} upcoming session(s)`, to: "/player/attendance" });
  }
  if (data.latest_evaluation_avg != null) {
    items.push({ text: `Latest evaluation: ${data.latest_evaluation_avg}/5`, to: "/player/evaluations" });
  }
  return { count: data.upcoming_sessions || 0, items };
}

export default function AppLayout({ role, title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV_ITEMS[role] || [];
  const { count: notifCount, items: notifItems } = useNotifications(role);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="ab-app-shell" data-role={role}>
      <aside className="ab-sidebar">
        <div className="ab-sidebar-brand">
          <VarsityCrest compact size={34} className="ab-brand-mark" />
          <span className="ab-sidebar-brand-text">Actibase</span>
        </div>
        <div className="ab-sidebar-role">{ROLE_LABEL[role]} Module</div>
        <nav className="nav flex-column flex-grow-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
              >
                <Icon size={18} strokeWidth={2} />
                <span className="ab-nav-label">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="ab-sidebar-footer">
          <button type="button" className="btn btn-outline-secondary btn-sm w-100" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>
      <div className="ab-main">
        <header className="ab-topbar d-flex justify-content-between align-items-center">
          <h1 className="h5 mb-0">{title}</h1>
          <div className="d-flex align-items-center gap-2">
            <Dropdown align="end">
              <Dropdown.Toggle as="button" className="ab-bell-btn" id="notif-menu">
                <Bell size={18} />
                {notifCount > 0 && <span className="ab-bell-badge">{notifCount}</span>}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Header>Notifications</Dropdown.Header>
                {notifItems.length === 0 && <Dropdown.ItemText className="text-muted small">Nothing new.</Dropdown.ItemText>}
                {notifItems.map((n) => (
                  <Dropdown.Item as={Link} to={n.to} key={n.text}>
                    {n.text}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>

            <Dropdown align="end">
              <Dropdown.Toggle
                as="button"
                className="btn btn-light btn-sm d-flex align-items-center gap-2 border"
                id="user-menu"
              >
                <span
                  className="ab-avatar rounded-circle text-white d-inline-flex align-items-center justify-content-center"
                  style={{ width: 28, height: 28, fontSize: 13 }}
                >
                  {user?.name?.[0]?.toUpperCase() ?? "?"}
                </span>
                {user?.name}
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.ItemText className="text-muted small">{user?.email}</Dropdown.ItemText>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout}>Log out</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </header>
        <main className="ab-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
