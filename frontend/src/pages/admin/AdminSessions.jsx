import { useMemo, useState } from "react";
import Badge from "react-bootstrap/Badge";
import Form from "react-bootstrap/Form";
import { useFetch } from "../../hooks/useFetch";
import { Loading, ErrorAlert } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";

export default function AdminSessions() {
  const { data: sessions, loading, error } = useFetch("/admin/sessions");
  const [sport, setSport] = useState("all");

  const sports = useMemo(() => {
    if (!sessions) return [];
    return [...new Set(sessions.map((s) => s.sport).filter(Boolean))].sort();
  }, [sessions]);

  const filtered = useMemo(() => {
    if (!sessions) return [];
    return sport === "all" ? sessions : sessions.filter((s) => s.sport === sport);
  }, [sessions, sport]);

  const columns = [
    { key: "date", label: "Date" },
    { key: "time", label: "Time" },
    { key: "sport", label: "Sport" },
    { key: "type", label: "Type" },
    { key: "location", label: "Location" },
    {
      key: "status",
      label: "Status",
      render: (r) => <Badge bg={r.status === "Completed" ? "success" : "info"}>{r.status}</Badge>,
    },
    {
      key: "rate",
      label: "Attendance",
      render: (r) => (r.rate != null ? `${r.present}/${r.total} (${r.rate}%)` : "—"),
    },
    {
      key: "activity_names",
      label: "Activities",
      render: (r) => (r.activity_names?.length ? r.activity_names.join(", ") : "—"),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Sessions"
        subtitle="Every training session across every coach."
        actions={
          <Form.Select size="sm" style={{ width: 180 }} value={sport} onChange={(e) => setSport(e.target.value)}>
            <option value="all">All sports</option>
            {sports.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Form.Select>
        }
      />
      <ErrorAlert message={error} />
      {loading ? <Loading /> : <DataTable columns={columns} rows={filtered} emptyMessage="No sessions yet." />}
    </div>
  );
}
