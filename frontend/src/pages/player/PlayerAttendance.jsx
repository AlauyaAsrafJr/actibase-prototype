import Badge from "react-bootstrap/Badge";
import { useFetch } from "../../hooks/useFetch";
import { Loading, ErrorAlert } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";

const STATUS_VARIANT = { Present: "success", Late: "warning", Absent: "danger", Upcoming: "info" };

export default function PlayerAttendance() {
  const { data: rows, loading, error } = useFetch("/player/attendance");

  const columns = [
    { key: "date", label: "Date" },
    { key: "type", label: "Type" },
    { key: "location", label: "Location" },
    {
      key: "status",
      label: "Status",
      render: (r) => <Badge bg={STATUS_VARIANT[r.status] || "secondary"}>{r.status}</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Your session history." />
      <ErrorAlert message={error} />
      {loading ? <Loading /> : <DataTable columns={columns} rows={rows} emptyMessage="No sessions yet." />}
    </div>
  );
}
