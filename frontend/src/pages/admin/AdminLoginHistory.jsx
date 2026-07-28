import Badge from "react-bootstrap/Badge";
import { useFetch } from "../../hooks/useFetch";
import { Loading, ErrorAlert } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";

function formatTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString();
}

export default function AdminLoginHistory() {
  const { data: rows, loading, error } = useFetch("/admin/login-history");

  const columns = [
    { key: "user_name", label: "User" },
    { key: "role", label: "Role", render: (r) => <span className="text-capitalize">{r.role}</span> },
    { key: "login_time", label: "Login", render: (r) => formatTime(r.login_time) },
    {
      key: "logout_time",
      label: "Logout",
      render: (r) =>
        r.logout_time ? formatTime(r.logout_time) : <Badge bg="success">Active session</Badge>,
    },
    { key: "ip_address", label: "IP address", render: (r) => r.ip_address || "—" },
    { key: "device_info", label: "Device", render: (r) => r.device_info || "—" },
  ];

  return (
    <div>
      <PageHeader title="Login History" subtitle="Recent sign-ins across every account, most recent first." />
      <ErrorAlert message={error} />
      {loading ? <Loading /> : <DataTable columns={columns} rows={rows} emptyMessage="No login activity yet." />}
    </div>
  );
}
