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

const REPORT_RANGES = ["Last 7 days", "Last 30 days", "All time"];

export default function CoachReports() {
  const { data: reports, loading, error, reload } = useFetch("/coach/reports");
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [range, setRange] = useState(REPORT_RANGES[2]);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [viewing, setViewing] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      await api.post("/coach/reports", { name: name.trim() || undefined, range });
      setShow(false);
      setName("");
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    { key: "name", label: "Name" },
    { key: "sport", label: "Sport" },
    { key: "range", label: "Range" },
    { key: "generated_on", label: "Generated" },
    {
      key: "status",
      label: "Status",
      render: (r) => <Badge bg={r.status === "Ready" ? "success" : "warning"}>{r.status}</Badge>,
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <Button size="sm" variant="outline-secondary" onClick={() => setViewing(r)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Reports for your team."
        actions={
          <Button size="sm" onClick={() => setShow(true)}>
            Generate report
          </Button>
        }
      />
      <ErrorAlert message={error} />
      {loading ? <Loading /> : <DataTable columns={columns} rows={reports} emptyMessage="No reports yet." />}

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">Generate report</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreate}>
          <Modal.Body>
            <ErrorAlert message={formError} />
            <Form.Group className="mb-3">
              <Form.Label>Report name</Form.Label>
              <Form.Control value={name} onChange={(e) => setName(e.target.value)} placeholder="Weekly Attendance Summary" />
            </Form.Group>
            <Form.Group>
              <Form.Label>Range</Form.Label>
              <Form.Select value={range} onChange={(e) => setRange(e.target.value)}>
                {REPORT_RANGES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Form.Select>
              <div className="text-muted small mt-1">Attendance, evaluations, and sessions are computed only within this range.</div>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShow(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Generating…" : "Generate"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={!!viewing} onHide={() => setViewing(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">{viewing?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-muted small mb-3">
            {viewing?.sport} · {viewing?.range} · Generated {viewing?.generated_on}
          </div>
          <div>{viewing?.details}</div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" size="sm" onClick={() => setViewing(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
