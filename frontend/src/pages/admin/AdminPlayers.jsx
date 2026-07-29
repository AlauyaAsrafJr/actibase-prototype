import { useMemo, useState } from "react";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import Form from "react-bootstrap/Form";
import ProgressBar from "react-bootstrap/ProgressBar";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../api/client";
import { Loading, ErrorAlert } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import ConfirmModal from "../../components/ConfirmModal";

const STATUS_VARIANT = { Active: "success", Inactive: "secondary", Archived: "dark" };

export default function AdminPlayers() {
  const { data: players, loading, error, reload } = useFetch("/admin/players");
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sport, setSport] = useState("all");

  const sports = useMemo(() => {
    if (!players) return [];
    return [...new Set(players.map((p) => p.sport).filter(Boolean))].sort();
  }, [players]);

  const filtered = useMemo(() => {
    if (!players) return [];
    return sport === "all" ? players : players.filter((p) => p.sport === sport);
  }, [players, sport]);

  async function handleConfirm() {
    if (!confirmTarget) return;
    setBusy(true);
    try {
      if (confirmTarget.action === "archive") {
        await api.post(`/admin/players/${confirmTarget.id}/archive`);
      } else {
        await api.delete(`/admin/players/${confirmTarget.id}`);
      }
      setConfirmTarget(null);
      reload();
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    { key: "name", label: "Name" },
    { key: "sport", label: "Sport" },
    { key: "coach_name", label: "Coach", render: (r) => r.coach_name || "—" },
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
    {
      key: "status",
      label: "Status",
      render: (r) => <Badge bg={STATUS_VARIANT[r.status] || "secondary"}>{r.status}</Badge>,
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="d-flex gap-2 justify-content-end">
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => setConfirmTarget({ id: r.id, action: "archive", name: r.name })}
          >
            Archive
          </Button>
          <Button
            size="sm"
            variant="outline-danger"
            onClick={() => setConfirmTarget({ id: r.id, action: "delete", name: r.name })}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Players"
        subtitle="Every player across every sport, program-wide."
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
      {loading ? <Loading /> : <DataTable columns={columns} rows={filtered} emptyMessage="No players in this sport yet." />}

      <ConfirmModal
        show={!!confirmTarget}
        title={confirmTarget?.action === "delete" ? "Delete player" : "Archive player"}
        body={
          confirmTarget?.action === "delete"
            ? `Permanently delete ${confirmTarget?.name}? This can't be undone.`
            : `Archive ${confirmTarget?.name}? They'll be moved to the archive and can be restored later.`
        }
        confirmLabel={confirmTarget?.action === "delete" ? "Delete" : "Archive"}
        variant={confirmTarget?.action === "delete" ? "danger" : "secondary"}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
