import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Badge from "react-bootstrap/Badge";
import Dropdown from "react-bootstrap/Dropdown";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../api/client";
import { Loading, ErrorAlert } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import ConfirmModal from "../../components/ConfirmModal";
import RowActionsMenu from "../../components/RowActionsMenu";

export default function CoachSessions() {
  const { data: sessions, loading, error, reload } = useFetch("/coach/sessions");
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ date: "", time: "", type: "Practice", location: "Main Gym" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editing, setEditing] = useState(null); // session row | null
  const [editForm, setEditForm] = useState({ date: "", time: "", type: "Practice", location: "" });
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.date.trim()) {
      setFormError("Date is required.");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      await api.post("/coach/sessions", form);
      setShow(false);
      setForm({ date: "", time: "", type: "Practice", location: "Main Gym" });
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(r) {
    setEditing(r);
    setEditForm({ date: r.date, time: r.time || "", type: r.type, location: r.location || "" });
    setEditError("");
  }

  async function handleEditSave(e) {
    e.preventDefault();
    if (!editForm.date.trim()) {
      setEditError("Date is required.");
      return;
    }
    setEditError("");
    setSavingEdit(true);
    try {
      await api.patch(`/coach/sessions/${editing.id}`, editForm);
      setEditing(null);
      reload();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/coach/sessions/${deleteTarget.id}`);
      setDeleteTarget(null);
      reload();
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    { key: "date", label: "Date" },
    { key: "time", label: "Time" },
    { key: "type", label: "Type" },
    { key: "location", label: "Location" },
    {
      key: "status",
      label: "Status",
      render: (r) => <Badge bg={r.status === "Completed" ? "success" : "info"}>{r.status}</Badge>,
    },
    {
      key: "rate",
      label: "Attendance",
      render: (r) => (r.rate != null ? `${r.present}/${r.total} (${r.rate}%)` : "—"),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="d-flex gap-2 justify-content-end align-items-center">
          <Button size="sm" variant="outline-primary" onClick={() => navigate(`/coach/sessions/${r.id}/attendance`)}>
            Attendance
          </Button>
          <RowActionsMenu label={`Actions for ${r.type} on ${r.date}`}>
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
        title="Sessions"
        subtitle="Your practices, scrimmages, and games."
        actions={
          <Button size="sm" onClick={() => setShow(true)}>
            New session
          </Button>
        }
      />
      <ErrorAlert message={error} />
      {loading ? <Loading /> : <DataTable columns={columns} rows={sessions} emptyMessage="No sessions yet." />}

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">New session</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreate}>
          <Modal.Body>
            <ErrorAlert message={formError} />
            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                placeholder="Jul 20, 2026"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Time</Form.Label>
              <Form.Control
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                placeholder="4:00 PM"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Type</Form.Label>
              <Form.Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option>Practice</option>
                <option>Scrimmage</option>
                <option>Game</option>
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Location</Form.Label>
              <Form.Control value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShow(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create session"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={!!editing} onHide={() => setEditing(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">Edit session</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditSave}>
          <Modal.Body>
            <ErrorAlert message={editError} />
            <Form.Group className="mb-3">
              <Form.Label>Date</Form.Label>
              <Form.Control
                value={editForm.date}
                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                placeholder="Jul 20, 2026"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Time</Form.Label>
              <Form.Control
                value={editForm.time}
                onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                placeholder="4:00 PM"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Type</Form.Label>
              <Form.Select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}>
                <option>Practice</option>
                <option>Scrimmage</option>
                <option>Game</option>
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Location</Form.Label>
              <Form.Control value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
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
        title="Delete session"
        body={`Permanently delete the ${deleteTarget?.type} on ${deleteTarget?.date}? This can't be undone.`}
        confirmLabel="Delete"
        variant="danger"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
