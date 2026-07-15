import { useState } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Badge from "react-bootstrap/Badge";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../api/client";
import { Loading, ErrorAlert } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import ConfirmModal from "../../components/ConfirmModal";

const STATUS_VARIANT = { Active: "success", Inactive: "secondary", Archived: "dark" };

export default function AdminUsers() {
  const { data: users, loading, error, reload } = useFetch("/admin/users");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "Coach" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { id, action: 'archive'|'delete', name }
  const [busy, setBusy] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setFormError("Name and email are required.");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      await api.post("/admin/users", form);
      setShowCreate(false);
      setForm({ name: "", email: "", role: "Coach" });
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm() {
    if (!confirmTarget) return;
    setBusy(true);
    try {
      if (confirmTarget.action === "archive") {
        await api.post(`/admin/users/${confirmTarget.id}/archive`);
      } else {
        await api.delete(`/admin/users/${confirmTarget.id}`);
      }
      setConfirmTarget(null);
      reload();
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role", render: (r) => <span className="text-capitalize">{r.role}</span> },
    {
      key: "status",
      label: "Status",
      render: (r) => <Badge bg={STATUS_VARIANT[r.status] || "secondary"}>{r.status}</Badge>,
    },
    { key: "last_active", label: "Last active" },
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
        title="Users"
        subtitle="Admin, coach, and staff accounts."
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            New user
          </Button>
        }
      />
      <ErrorAlert message={error} />
      {loading ? <Loading /> : <DataTable columns={columns} rows={users} emptyMessage="No users yet." />}

      <Modal show={showCreate} onHide={() => setShowCreate(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">New user</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreate}>
          <Modal.Body>
            <ErrorAlert message={formError} />
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Role</Form.Label>
              <Form.Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="Admin">Admin</option>
                <option value="Coach">Coach</option>
                <option value="Staff">Staff</option>
              </Form.Select>
            </Form.Group>
            <div className="text-muted small mt-3">New accounts get the default password &quot;changeme&quot;.</div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowCreate(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create user"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <ConfirmModal
        show={!!confirmTarget}
        title={confirmTarget?.action === "delete" ? "Delete user" : "Archive user"}
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
