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

export default function AdminReports() {
  const { data: reports, loading, error, reload } = useFetch("/admin/reports");
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [sport, setSport] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      await api.post("/admin/reports", { name: name.trim() || undefined, sport: sport.trim() || undefined });
      setShow(false);
      setName("");
      setSport("");
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
        subtitle="Program-wide reports across every sport."
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
              <Form.Label>Sport</Form.Label>
              <Form.Control value={sport} onChange={(e) => setSport(e.target.value)} placeholder="All sports" />
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
