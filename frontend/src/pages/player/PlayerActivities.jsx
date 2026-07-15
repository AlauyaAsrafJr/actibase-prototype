import Badge from "react-bootstrap/Badge";
import { useFetch } from "../../hooks/useFetch";
import { Loading, ErrorAlert } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";

const DIFFICULTY_VARIANT = { Beginner: "success", Intermediate: "warning", Advanced: "danger" };

export default function PlayerActivities() {
  const { data: activities, loading, error } = useFetch("/player/activities");

  const columns = [
    { key: "date", label: "Date" },
    { key: "name", label: "Activity" },
    { key: "category", label: "Category" },
    { key: "duration", label: "Duration" },
    {
      key: "difficulty",
      label: "Difficulty",
      render: (r) => <Badge bg={DIFFICULTY_VARIANT[r.difficulty] || "secondary"}>{r.difficulty}</Badge>,
    },
  ];

  return (
    <div>
      <PageHeader title="Activities" subtitle="Drills assigned to your training sessions." />
      <ErrorAlert message={error} />
      {loading ? <Loading /> : <DataTable columns={columns} rows={activities} emptyMessage="No activities assigned yet." />}
    </div>
  );
}
