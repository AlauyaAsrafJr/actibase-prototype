import Badge from "react-bootstrap/Badge";
import { useFetch } from "../../hooks/useFetch";
import { Loading, ErrorAlert } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";

const STATUS_VARIANT = { Completed: "success", Absent: "danger" };

export default function PlayerActivities() {
  const { data: activities, loading, error } = useFetch("/player/activities");

  const columns = [
    { key: "date", label: "Date" },
    { key: "name", label: "Activity" },
    { key: "duration", label: "Duration", render: (r) => r.duration || "—" },
    { key: "notes", label: "Notes", render: (r) => r.notes || "—" },
    {
      key: "participation_status",
      label: "Participation",
      render: (r) => <Badge bg={STATUS_VARIANT[r.participation_status] || "secondary"}>{r.participation_status}</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader title="Activities" subtitle="Training activities your coach has finalized attendance for." />
      <ErrorAlert message={error} />
      {loading ? <Loading /> : <DataTable columns={columns} rows={activities} emptyMessage="No finalized activities yet." />}
    </div>
  );
}
