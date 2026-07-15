import { NavLink, Outlet, useNavigate } from "react-router-dom";
import Dropdown from "react-bootstrap/Dropdown";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = {
  admin: [
    { to: "/admin", label: "Dashboard", end: true },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/players", label: "Players" },
    { to: "/admin/sessions", label: "Sessions" },
    { to: "/admin/reports", label: "Reports" },
    { to: "/admin/archive", label: "Archive" },
  ],
  coach: [
    { to: "/coach", label: "Dashboard", end: true },
    { to: "/coach/roster", label: "Roster" },
    { to: "/coach/sessions", label: "Sessions" },
    { to: "/coach/activities", label: "Activities" },
    { to: "/coach/evaluations", label: "Evaluations" },
    { to: "/coach/reports", label: "Reports" },
    { to: "/coach/profile", label: "Profile" },
  ],
  player: [
    { to: "/player", label: "Dashboard", end: true },
    { to: "/player/attendance", label: "Attendance" },
    { to: "/player/activities", label: "Activities" },
    { to: "/player/evaluations", label: "Evaluations" },
    { to: "/player/stats", label: "Team Stats" },
    { to: "/player/profile", label: "Profile" },
  ],
};

const ROLE_LABEL = { admin: "Administrator", coach: "Coach", player: "Player" };

export default function AppLayout({ role, title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV_ITEMS[role] || [];

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="ab-app-shell" data-role={role}>
      <aside className="ab-sidebar">
        <div className="ab-sidebar-brand">Actibase</div>
        <div className="ab-sidebar-role">{ROLE_LABEL[role]} Module</div>
        <nav className="nav flex-column flex-grow-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
            >
              <span className="ab-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="ab-sidebar-footer">
          <button type="button" className="btn btn-outline-light btn-sm w-100" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>
      <div className="ab-main">
        <header className="ab-topbar d-flex justify-content-between align-items-center">
          <h1 className="h5 mb-0">{title}</h1>
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
        </header>
        <main className="ab-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
