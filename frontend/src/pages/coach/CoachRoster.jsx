import ProgressBar from "react-bootstrap/ProgressBar";
import { useFetch } from "../../hooks/useFetch";
import { Loading, ErrorAlert } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";

export default function CoachRoster() {
  const { data: roster, loading, error } = useFetch("/coach/roster");

  const columns = [
    { key: "name", label: "Name" },
    { key: "year", label: "Year", render: (r) => r.year || "—" },
    { key: "position", label: "Position", render: (r) => r.position || "—" },
    {
      key: "attendance_pct",
      label: "Attendance",
      render: (r) => (
        <div style={{ maxWidth: 140 }}>
          <ProgressBar
            now={r.attendance_pct}
            label={`${r.attendance_pct}%`}
            variant={r.attendance_pct >= 80 ? "success" : r.attendance_pct >= 50 ? "warning" : "danger"}
          />
        </div>
      ),
    },
    { key: "last_eval", label: "Last eval" },
  ];

  return (
    <div>
      <PageHeader title="Roster" subtitle="Your players." />
      <ErrorAlert message={error} />
      {loading ? <Loading /> : <DataTable columns={columns} rows={roster} emptyMessage="No players on your roster yet." />}
    </div>
  );
}
