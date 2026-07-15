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

export default function CoachReports() {
  const { data: reports, loading, error, reload } = useFetch("/coach/reports");
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      await api.post("/coach/reports", { name: name.trim() || undefined });
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
            <Form.Group>
              <Form.Label>Report name</Form.Label>
              <Form.Control value={name} onChange={(e) => setName(e.target.value)} placeholder="Weekly Attendance Summary" />
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
    </div>
  );
}
