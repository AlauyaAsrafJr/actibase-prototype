import { useFetch } from "../../hooks/useFetch";
import { Loading, ErrorAlert } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";

export default function PlayerEvaluations() {
  const { data: evaluations, loading, error } = useFetch("/player/evaluations");

  const columns = [
    { key: "date", label: "Date" },
    { key: "coach_name", label: "Coach" },
    { key: "skill", label: "Skill" },
    { key: "effort", label: "Effort" },
    { key: "teamwork", label: "Teamwork" },
    { key: "attitude", label: "Attitude" },
    { key: "comment", label: "Comment", render: (r) => r.comment || "—" },
  ];

  return (
    <div>
      <PageHeader title="Evaluations" subtitle="Feedback from your coach." />
      <ErrorAlert message={error} />
      {loading ? <Loading /> : <DataTable columns={columns} rows={evaluations} emptyMessage="No evaluations yet." />}
    </div>
  );
}
