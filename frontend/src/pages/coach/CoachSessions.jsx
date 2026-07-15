import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Badge from "react-bootstrap/Badge";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../api/client";
import { Loading, ErrorAlert } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";

export default function CoachSessions() {
  const { data: sessions, loading, error, reload } = useFetch("/coach/sessions");
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ date: "", time: "", type: "Practice", location: "Main Gym" });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        <Button size="sm" variant="outline-primary" onClick={() => navigate(`/coach/sessions/${r.id}/attendance`)}>
          Attendance
        </Button>
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
    </div>
  );
}
