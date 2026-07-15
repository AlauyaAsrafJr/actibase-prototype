import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Badge from "react-bootstrap/Badge";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../api/client";
import { Loading, ErrorAlert } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";

const STATUS_OPTIONS = [
  { value: "present", label: "Present", variant: "success" },
  { value: "late", label: "Late", variant: "warning" },
  { value: "absent", label: "Absent", variant: "danger" },
];

export default function CoachAttendance() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { data: rows, loading, error, reload, setData } = useFetch(`/coach/attendance/${sessionId}`);
  const [busyAction, setBusyAction] = useState(false);
  const [actionError, setActionError] = useState("");

  async function markStatus(playerId, status) {
    setData((prev) => prev.map((r) => (r.player_id === playerId ? { ...r, status } : r)));
    try {
      await api.post(`/coach/attendance/${sessionId}/mark`, { player_id: playerId, status });
    } catch (err) {
      setActionError(err.message);
      reload();
    }
  }

  async function markAllPresent() {
    setBusyAction(true);
    setActionError("");
    try {
      await api.post(`/coach/attendance/${sessionId}/mark-all-present`);
      reload();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyAction(false);
    }
  }

  async function saveAndFinalize() {
    setBusyAction(true);
    setActionError("");
    try {
      await api.post(`/coach/attendance/${sessionId}/save`);
      navigate("/coach/sessions");
    } catch (err) {
      setActionError(err.message);
      setBusyAction(false);
    }
  }

  const columns = [
    { key: "name", label: "Name" },
    { key: "position", label: "Position", render: (r) => r.position || "—" },
    {
      key: "status",
      label: "Attendance",
      render: (r) => (
        <ButtonGroup size="sm">
          {STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={r.status === opt.value ? opt.variant : `outline-${opt.variant}`}
              onClick={() => markStatus(r.player_id, opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </ButtonGroup>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle={`Session #${sessionId}`}
        actions={
          <>
            <Button size="sm" variant="outline-secondary" onClick={markAllPresent} disabled={busyAction}>
              Mark all present
            </Button>
            <Button size="sm" onClick={saveAndFinalize} disabled={busyAction}>
              Save &amp; finalize
            </Button>
          </>
        }
      />
      <ErrorAlert message={error || actionError} />
      {loading ? <Loading /> : <DataTable columns={columns} rows={rows} rowKey="player_id" emptyMessage="No players on your roster yet." />}
      {rows && (
        <div className="text-muted small mt-3">
          <Badge bg="light" text="dark" className="border">
            {rows.filter((r) => r.status !== "absent").length}/{rows.length} marked present or late
          </Badge>
        </div>
      )}
    </div>
  );
}
