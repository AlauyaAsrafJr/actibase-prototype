import { useMemo, useState } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Badge from "react-bootstrap/Badge";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../api/client";
import { Loading, ErrorAlert } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import ConfirmModal from "../../components/ConfirmModal";

const TYPE_VARIANT = { Player: "primary", User: "secondary", Session: "info" };

export default function AdminArchive() {
  const { data: records, loading, error, reload } = useFetch("/admin/archive");
  const [type, setType] = useState("all");
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    if (!records) return [];
    return type === "all" ? records : records.filter((r) => r.type === type);
  }, [records, type]);

  async function handleConfirm() {
    if (!confirmTarget) return;
    setBusy(true);
    try {
      if (confirmTarget.action === "restore") {
        await api.post(`/admin/archive/${confirmTarget.id}/restore`);
      } else {
        await api.delete(`/admin/archive/${confirmTarget.id}`);
      }
      setConfirmTarget(null);
      reload();
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    { key: "name", label: "Name" },
    {
      key: "type",
      label: "Type",
      render: (r) => <Badge bg={TYPE_VARIANT[r.type] || "secondary"}>{r.type}</Badge>,
    },
    { key: "archived_on", label: "Archived on" },
    { key: "archived_by", label: "Archived by" },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="d-flex gap-2 justify-content-end">
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => setConfirmTarget({ id: r.id, action: "restore", name: r.name })}
          >
            Restore
          </Button>
          <Button
            size="sm"
            variant="outline-danger"
            onClick={() => setConfirmTarget({ id: r.id, action: "delete", name: r.name })}
          >
            Delete forever
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Archive"
        subtitle="Archived users, players, and session records."
        actions={
          <Form.Select size="sm" style={{ width: 160 }} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All types</option>
            <option value="Player">Player</option>
            <option value="User">User</option>
            <option value="Session">Session</option>
          </Form.Select>
        }
      />
      <ErrorAlert message={error} />
      {loading ? <Loading /> : <DataTable columns={columns} rows={filtered} emptyMessage="Nothing archived." />}

      <ConfirmModal
        show={!!confirmTarget}
        title={confirmTarget?.action === "delete" ? "Delete forever" : "Restore record"}
        body={
          confirmTarget?.action === "delete"
            ? `Permanently delete "${confirmTarget?.name}"? This can't be undone.`
            : `Restore "${confirmTarget?.name}"? Any linked account will be reactivated.`
        }
        confirmLabel={confirmTarget?.action === "delete" ? "Delete forever" : "Restore"}
        variant={confirmTarget?.action === "delete" ? "danger" : "secondary"}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
