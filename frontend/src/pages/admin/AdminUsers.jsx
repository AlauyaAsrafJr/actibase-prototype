import { useState } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Badge from "react-bootstrap/Badge";
import Alert from "react-bootstrap/Alert";
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
  const [confirmTarget, setConfirmTarget] = useState(null); // { id, action: 'archive'|'delete'|'reset'|'deactivate', name }
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null); // { id, name, email } | null
  const [editForm, setEditForm] = useState({ name: "", email: "" });
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  function openEdit(r) {
    setEditing(r);
    setEditForm({ name: r.name, email: r.email });
    setEditError("");
  }

  async function handleEditSave(e) {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.email.trim()) {
      setEditError("Name and email are required.");
      return;
    }
    setEditError("");
    setSavingEdit(true);
    try {
      await api.patch(`/admin/users/${editing.id}`, editForm);
      setEditing(null);
      reload();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

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
      } else if (confirmTarget.action === "delete") {
        await api.delete(`/admin/users/${confirmTarget.id}`);
      } else if (confirmTarget.action === "deactivate") {
        await api.post(`/admin/users/${confirmTarget.id}/deactivate`);
      } else if (confirmTarget.action === "reset") {
        const result = await api.post(`/admin/users/${confirmTarget.id}/reset-password`);
        setNotice(`${confirmTarget.name}'s password was reset to "${result.new_password}".`);
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
        <div className="d-flex gap-2 justify-content-end flex-wrap">
          <Button size="sm" variant="outline-secondary" onClick={() => openEdit(r)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => setConfirmTarget({ id: r.id, action: "reset", name: r.name })}
          >
            Reset password
          </Button>
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => setConfirmTarget({ id: r.id, action: "deactivate", name: r.name, status: r.status })}
          >
            {r.status === "Inactive" ? "Activate" : "Deactivate"}
          </Button>
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

  const CONFIRM_COPY = {
    delete: { title: "Delete user", body: `Permanently delete ${confirmTarget?.name}? This can't be undone.`, label: "Delete", variant: "danger" },
    archive: { title: "Archive user", body: `Archive ${confirmTarget?.name}? They'll be moved to the archive and can be restored later.`, label: "Archive", variant: "secondary" },
    reset: { title: "Reset password", body: `Reset ${confirmTarget?.name}'s password to the default ("changeme")?`, label: "Reset", variant: "secondary" },
    deactivate: {
      title: confirmTarget?.status === "Inactive" ? "Activate user" : "Deactivate user",
      body:
        confirmTarget?.status === "Inactive"
          ? `Reactivate ${confirmTarget?.name}'s account?`
          : `Deactivate ${confirmTarget?.name}'s account? They won't be able to log in until reactivated.`,
      label: confirmTarget?.status === "Inactive" ? "Activate" : "Deactivate",
      variant: "secondary",
    },
  };
  const confirmCopy = confirmTarget ? CONFIRM_COPY[confirmTarget.action] : null;

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Admin and coach accounts."
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            New user
          </Button>
        }
      />
      {notice && (
        <Alert variant="success" dismissible onClose={() => setNotice("")} className="mb-3">
          {notice}
        </Alert>
      )}
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

      <Modal show={!!editing} onHide={() => setEditing(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">Edit {editing?.name}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditSave}>
          <Modal.Body>
            <ErrorAlert message={editError} />
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </Form.Group>
            <Form.Group>
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setEditing(null)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button type="submit" disabled={savingEdit}>
              {savingEdit ? "Saving…" : "Save changes"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <ConfirmModal
        show={!!confirmTarget}
        title={confirmCopy?.title}
        body={confirmCopy?.body}
        confirmLabel={confirmCopy?.label}
        variant={confirmCopy?.variant}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
