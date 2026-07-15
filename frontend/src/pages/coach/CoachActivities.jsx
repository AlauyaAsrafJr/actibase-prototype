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

const DIFFICULTY_VARIANT = { Beginner: "success", Intermediate: "warning", Advanced: "danger" };

export default function CoachActivities() {
  const { data: activities, loading, error, reload } = useFetch("/coach/activities");
  const { data: sessions } = useFetch("/coach/sessions");

  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: "", category: "", duration: "", difficulty: "Beginner", description: "" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [assignTarget, setAssignTarget] = useState(null);
  const [assignSessionId, setAssignSessionId] = useState("");
  const [assignError, setAssignError] = useState("");
  const [assigning, setAssigning] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      await api.post("/coach/activities", form);
      setShow(false);
      setForm({ name: "", category: "", duration: "", difficulty: "Beginner", description: "" });
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function openAssign(activity) {
    setAssignTarget(activity);
    setAssignSessionId(sessions?.[0]?.id ?? "");
    setAssignError("");
  }

  async function handleAssign(e) {
    e.preventDefault();
    if (!assignSessionId) {
      setAssignError("Choose a session.");
      return;
    }
    setAssigning(true);
    setAssignError("");
    try {
      await api.post(`/coach/activities/${assignTarget.id}/assign`, { session_id: Number(assignSessionId) });
      setAssignTarget(null);
      reload();
    } catch (err) {
      setAssignError(err.message);
    } finally {
      setAssigning(false);
    }
  }

  const columns = [
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
    { key: "duration", label: "Duration" },
    {
      key: "difficulty",
      label: "Difficulty",
      render: (r) => <Badge bg={DIFFICULTY_VARIANT[r.difficulty] || "secondary"}>{r.difficulty}</Badge>,
    },
    {
      key: "assigned_session_ids",
      label: "Assigned to",
      render: (r) => (r.assigned_session_ids?.length ? `${r.assigned_session_ids.length} session(s)` : "—"),
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <Button size="sm" variant="outline-primary" onClick={() => openAssign(r)}>
          Assign to session
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Activities"
        subtitle="Drills and activities you use in training."
        actions={
          <Button size="sm" onClick={() => setShow(true)}>
            New activity
          </Button>
        }
      />
      <ErrorAlert message={error} />
      {loading ? <Loading /> : <DataTable columns={columns} rows={activities} emptyMessage="No activities yet." />}

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">New activity</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreate}>
          <Modal.Body>
            <ErrorAlert message={formError} />
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Category</Form.Label>
              <Form.Control
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Shooting, Defense, Conditioning…"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Duration</Form.Label>
              <Form.Control
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                placeholder="15 min"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Difficulty</Form.Label>
              <Form.Select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShow(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create activity"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={!!assignTarget} onHide={() => setAssignTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">Assign &quot;{assignTarget?.name}&quot;</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAssign}>
          <Modal.Body>
            <ErrorAlert message={assignError} />
            {sessions?.length ? (
              <Form.Group>
                <Form.Label>Session</Form.Label>
                <Form.Select value={assignSessionId} onChange={(e) => setAssignSessionId(e.target.value)}>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.date} · {s.time} · {s.type}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            ) : (
              <div className="text-muted">Create a session first.</div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setAssignTarget(null)} disabled={assigning}>
              Cancel
            </Button>
            <Button type="submit" disabled={assigning || !sessions?.length}>
              {assigning ? "Assigning…" : "Assign"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
