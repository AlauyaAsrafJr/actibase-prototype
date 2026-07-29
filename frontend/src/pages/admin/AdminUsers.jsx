import { useEffect, useState } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Badge from "react-bootstrap/Badge";
import Alert from "react-bootstrap/Alert";
import Dropdown from "react-bootstrap/Dropdown";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../api/client";
import { Loading, ErrorAlert } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import ConfirmModal from "../../components/ConfirmModal";
import RowActionsMenu from "../../components/RowActionsMenu";

const STATUS_VARIANT = { Active: "success", Inactive: "secondary", Archived: "dark" };

export default function AdminUsers() {
  const { data: users, loading, error, reload } = useFetch("/admin/users");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "Coach", sport: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { id, action: 'archive'|'delete'|'reset'|'deactivate', name }
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null); // { id, name, email } | null
  const [editForm, setEditForm] = useState({ name: "", email: "", sport: "" });
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const existingSports = [...new Set((users || []).filter((u) => u.role === "coach" && u.sport).map((u) => u.sport))].sort();

  const [selected, setSelected] = useState(() => new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    if (!users) return;
    setSelected((prev) => {
      const ids = new Set(users.map((u) => u.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [users]);

  const allSelected = users?.length > 0 && users.every((u) => selected.has(u.id));

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(users.map((u) => u.id)));
  }

  async function handleBulkArchive() {
    setBulkBusy(true);
    try {
      await api.post("/admin/users/archive-bulk", { ids: [...selected] });
      setSelected(new Set());
      setBulkConfirm(false);
      reload();
    } finally {
      setBulkBusy(false);
    }
  }

  function openEdit(r) {
    setEditing(r);
    setEditForm({ name: r.name, email: r.email, sport: r.sport || "" });
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
      const payload = { name: editForm.name, email: editForm.email };
      if (editing.role === "coach") payload.sport = editForm.sport;
      await api.patch(`/admin/users/${editing.id}`, payload);
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
      await api.post("/admin/users", form.role === "Coach" ? form : { name: form.name, email: form.email, role: form.role });
      setShowCreate(false);
      setForm({ name: "", email: "", role: "Coach", sport: "" });
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
    {
      key: "select",
      label: <Form.Check checked={!!allSelected} onChange={toggleAll} aria-label="Select all" />,
      render: (r) => <Form.Check checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} aria-label={`Select ${r.name}`} />,
    },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role", render: (r) => <span className="text-capitalize">{r.role}</span> },
    { key: "sport", label: "Sport", render: (r) => r.sport || "—" },
    {
      key: "status",
      label: "Status",
      render: (r) => <Badge bg={STATUS_VARIANT[r.status] || "secondary"}>{r.status}</Badge>,
    },
    { key: "last_active", label: "Last active" },
    {
      key: "last_admin_action",
      label: "Last admin action",
      render: (r) => <span className="text-muted small">{r.last_admin_action || "—"}</span>,
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="text-end">
          <RowActionsMenu label={`Actions for ${r.name}`}>
            <Dropdown.Item onClick={() => openEdit(r)}>Edit</Dropdown.Item>
            <Dropdown.Item onClick={() => setConfirmTarget({ id: r.id, action: "reset", name: r.name })}>
              Reset password
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() => setConfirmTarget({ id: r.id, action: "deactivate", name: r.name, status: r.status })}
            >
              {r.status === "Inactive" ? "Activate" : "Deactivate"}
            </Dropdown.Item>
            <Dropdown.Item onClick={() => setConfirmTarget({ id: r.id, action: "archive", name: r.name })}>
              Archive
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item
              className="text-danger"
              onClick={() => setConfirmTarget({ id: r.id, action: "delete", name: r.name })}
            >
              Delete
            </Dropdown.Item>
          </RowActionsMenu>
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
      {selected.size > 0 && (
        <div className="d-flex align-items-center gap-2 mb-2 p-2 bg-light border rounded">
          <span className="small text-muted">{selected.size} selected</span>
          <Button size="sm" variant="outline-secondary" onClick={() => setBulkConfirm(true)}>
            Archive selected
          </Button>
          <Button size="sm" variant="link" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}
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
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="Admin">Admin</option>
                <option value="Coach">Coach</option>
              </Form.Select>
            </Form.Group>
            {form.role === "Coach" && (
              <Form.Group>
                <Form.Label>Sport</Form.Label>
                <Form.Control
                  list="sport-options"
                  value={form.sport}
                  onChange={(e) => setForm({ ...form, sport: e.target.value })}
                  placeholder="Basketball, or type a new sport…"
                />
                <datalist id="sport-options">
                  {existingSports.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <div className="text-muted small mt-1">Type an existing sport, or a new one to add it to the program.</div>
              </Form.Group>
            )}
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
            <Form.Group className={editing?.role === "coach" ? "mb-3" : ""}>
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </Form.Group>
            {editing?.role === "coach" && (
              <Form.Group>
                <Form.Label>Sport</Form.Label>
                <Form.Control
                  list="sport-options"
                  value={editForm.sport}
                  onChange={(e) => setEditForm({ ...editForm, sport: e.target.value })}
                  placeholder="Basketball, or type a new sport…"
                />
                <datalist id="sport-options">
                  {existingSports.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </Form.Group>
            )}
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

      <ConfirmModal
        show={bulkConfirm}
        title="Archive selected users"
        body={`Archive ${selected.size} selected user(s)? They'll be moved to the archive and can be restored later.`}
        confirmLabel="Archive"
        variant="secondary"
        busy={bulkBusy}
        onConfirm={handleBulkArchive}
        onCancel={() => setBulkConfirm(false)}
      />
    </div>
  );
}
