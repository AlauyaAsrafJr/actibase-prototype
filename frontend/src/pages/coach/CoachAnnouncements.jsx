import { useState } from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../api/client";
import { Loading, ErrorAlert, EmptyState } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import ConfirmModal from "../../components/ConfirmModal";

const EMPTY_FORM = { title: "", body: "" };

export default function CoachAnnouncements() {
  const { data: announcements, loading, error, reload } = useFetch("/coach/announcements");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      setFormError("Title and message are both required.");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      await api.post("/coach/announcements", form);
      setShow(false);
      setForm(EMPTY_FORM);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/coach/announcements/${deleteTarget.id}`);
      setDeleteTarget(null);
      reload();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Post updates to your team; see program-wide notices too."
        actions={
          <Button size="sm" onClick={() => setShow(true)}>
            New announcement
          </Button>
        }
      />
      <ErrorAlert message={error} />
      {loading && <Loading />}
      {!loading && (!announcements || announcements.length === 0) && <EmptyState message="No announcements yet." />}
      <div className="d-flex flex-column gap-3">
        {announcements?.map((a) => (
          <Card key={a.id}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-1 gap-2">
                <Card.Title className="h6 mb-0">{a.title}</Card.Title>
                <div className="d-flex align-items-center gap-2 flex-shrink-0">
                  <Badge bg="secondary" className="fw-normal">
                    {a.audience}
                  </Badge>
                  {a.mine && (
                    <Button variant="link" size="sm" className="text-danger p-0" onClick={() => setDeleteTarget(a)}>
                      Delete
                    </Button>
                  )}
                </div>
              </div>
              <div className="text-muted small mb-2">
                {a.author_name} · {a.posted_date}
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>{a.body}</div>
            </Card.Body>
          </Card>
        ))}
      </div>

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">New announcement</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreate}>
          <Modal.Body>
            <ErrorAlert message={formError} />
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Practice moved to 5 PM" />
            </Form.Group>
            <Form.Group>
              <Form.Label>Message</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Let your team know what's going on…"
              />
            </Form.Group>
            <div className="text-muted small mt-2">Posted to your own roster only.</div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShow(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Posting…" : "Post announcement"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <ConfirmModal
        show={!!deleteTarget}
        title="Delete announcement"
        body={`Delete "${deleteTarget?.title}"? This can't be undone.`}
        confirmLabel="Delete"
        variant="danger"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
