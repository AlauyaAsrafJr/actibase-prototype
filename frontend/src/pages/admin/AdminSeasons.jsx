import { useState } from "react";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Dropdown from "react-bootstrap/Dropdown";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../api/client";
import { Loading, ErrorAlert } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import ConfirmModal from "../../components/ConfirmModal";
import RowActionsMenu from "../../components/RowActionsMenu";

const EMPTY_FORM = { name: "", start_date: "", end_date: "" };

export default function AdminSeasons() {
  const { data: seasons, loading, error, reload } = useFetch("/admin/seasons");

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const [editing, setEditing] = useState(null); // season row | null
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [busyActivateId, setBusyActivateId] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.start_date.trim() || !createForm.end_date.trim()) {
      setCreateError("Name, start date, and end date are all required.");
      return;
    }
    setCreateError("");
    setCreating(true);
    try {
      await api.post("/admin/seasons", createForm);
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      reload();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function openEdit(r) {
    setEditing(r);
    setEditForm({ name: r.name, start_date: r.start_date, end_date: r.end_date });
    setEditError("");
  }

  async function handleEditSave(e) {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.start_date.trim() || !editForm.end_date.trim()) {
      setEditError("Name, start date, and end date are all required.");
      return;
    }
    setEditError("");
    setSavingEdit(true);
    try {
      await api.patch(`/admin/seasons/${editing.id}`, editForm);
      setEditing(null);
      reload();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleActivate(r) {
    setBusyActivateId(r.id);
    try {
      await api.post(`/admin/seasons/${r.id}/activate`);
      reload();
    } finally {
      setBusyActivateId(null);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/admin/seasons/${deleteTarget.id}`);
      setDeleteTarget(null);
      reload();
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    { key: "name", label: "Name" },
    { key: "start_date", label: "Start" },
    { key: "end_date", label: "End" },
    {
      key: "is_active",
      label: "Status",
      render: (r) => (r.is_active ? <Badge bg="success">Active</Badge> : <span className="text-muted small">—</span>),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="d-flex gap-2 justify-content-end align-items-center">
          {!r.is_active && (
            <Button size="sm" variant="outline-secondary" disabled={busyActivateId === r.id} onClick={() => handleActivate(r)}>
              {busyActivateId === r.id ? "Setting…" : "Set active"}
            </Button>
          )}
          <RowActionsMenu label={`Actions for ${r.name}`}>
            <Dropdown.Item onClick={() => openEdit(r)}>Edit</Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item className="text-danger" onClick={() => setDeleteTarget(r)}>
              Delete
            </Dropdown.Item>
          </RowActionsMenu>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Seasons"
        subtitle="Define terms/seasons so reports can be scoped to a real time boundary."
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            New season
          </Button>
        }
      />
      <ErrorAlert message={error} />
      {loading ? <Loading /> : <DataTable columns={columns} rows={seasons} emptyMessage="No seasons yet." />}

      <Modal show={showCreate} onHide={() => setShowCreate(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">New season</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreate}>
          <Modal.Body>
            <ErrorAlert message={createError} />
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="AY 2026-2027, 1st Semester"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Start date</Form.Label>
              <Form.Control
                value={createForm.start_date}
                onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                placeholder="Aug 1, 2026"
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>End date</Form.Label>
              <Form.Control
                value={createForm.end_date}
                onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                placeholder="Dec 15, 2026"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowCreate(false)} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create season"}
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
            <Form.Group className="mb-3">
              <Form.Label>Start date</Form.Label>
              <Form.Control value={editForm.start_date} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })} />
            </Form.Group>
            <Form.Group>
              <Form.Label>End date</Form.Label>
              <Form.Control value={editForm.end_date} onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })} />
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
        show={!!deleteTarget}
        title="Delete season"
        body={`Delete "${deleteTarget?.name}"? Reports already generated against it keep their own saved data — this only removes the season definition itself.`}
        confirmLabel="Delete"
        variant="danger"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
