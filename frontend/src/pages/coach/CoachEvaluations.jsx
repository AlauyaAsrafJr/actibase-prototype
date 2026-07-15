import { useState } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../api/client";
import { Loading, ErrorAlert } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";

const RATING_FIELDS = ["skill", "effort", "teamwork", "attitude"];

const EMPTY_FORM = { player_id: "", skill: 3, effort: 3, teamwork: 3, attitude: 3, comment: "" };

export default function CoachEvaluations() {
  const { data: evaluations, loading, error, reload } = useFetch("/coach/evaluations");
  const { data: roster } = useFetch("/coach/roster");

  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function openModal() {
    setForm({ ...EMPTY_FORM, player_id: roster?.[0]?.id ?? "" });
    setFormError("");
    setShow(true);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.player_id) {
      setFormError("Choose a player.");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      await api.post("/coach/evaluations", { ...form, player_id: Number(form.player_id) });
      setShow(false);
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    { key: "player_name", label: "Player" },
    { key: "date", label: "Date" },
    { key: "skill", label: "Skill" },
    { key: "effort", label: "Effort" },
    { key: "teamwork", label: "Teamwork" },
    { key: "attitude", label: "Attitude" },
    { key: "comment", label: "Comment", render: (r) => r.comment || "—" },
  ];

  return (
    <div>
      <PageHeader
        title="Evaluations"
        subtitle="Player performance evaluations."
        actions={
          <Button size="sm" onClick={openModal} disabled={!roster?.length}>
            New evaluation
          </Button>
        }
      />
      <ErrorAlert message={error} />
      {loading ? <Loading /> : <DataTable columns={columns} rows={evaluations} emptyMessage="No evaluations yet." />}

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">New evaluation</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreate}>
          <Modal.Body>
            <ErrorAlert message={formError} />
            <Form.Group className="mb-3">
              <Form.Label>Player</Form.Label>
              <Form.Select value={form.player_id} onChange={(e) => setForm({ ...form, player_id: e.target.value })}>
                {roster?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            {RATING_FIELDS.map((field) => (
              <Form.Group className="mb-3" key={field}>
                <Form.Label className="text-capitalize d-flex justify-content-between">
                  <span>{field}</span>
                  <span className="text-muted">{form[field]}/5</span>
                </Form.Label>
                <Form.Range
                  min={1}
                  max={5}
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: Number(e.target.value) })}
                />
              </Form.Group>
            ))}

            <Form.Group>
              <Form.Label>Comment</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShow(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save evaluation"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
