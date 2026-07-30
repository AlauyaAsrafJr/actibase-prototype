import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Dropdown from "react-bootstrap/Dropdown";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../api/client";
import { Loading, ErrorAlert } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import RowActionsMenu from "../../components/RowActionsMenu";
import AttendanceBar from "../../components/AttendanceBar";

export default function CoachRoster() {
  const { data: roster, loading, error, reload } = useFetch("/coach/roster");
  const navigate = useNavigate();

  const [editing, setEditing] = useState(null); // roster row | null
  const [editForm, setEditForm] = useState({ position: "", year: "" });
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  function openEdit(r) {
    setEditing(r);
    setEditForm({ position: r.position || "", year: r.year || "" });
    setEditError("");
  }

  async function handleEditSave(e) {
    e.preventDefault();
    setEditError("");
    setSavingEdit(true);
    try {
      await api.patch(`/coach/roster/${editing.id}`, {
        position: editForm.position.trim() || null,
        year: editForm.year.trim() || null,
      });
      setEditing(null);
      reload();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  const columns = [
    { key: "name", label: "Name" },
    { key: "year", label: "Year", render: (r) => r.year || "—" },
    { key: "position", label: "Position", render: (r) => r.position || "—" },
    { key: "attendance_pct", label: "Attendance", render: (r) => <AttendanceBar value={r.attendance_pct} /> },
    { key: "last_eval", label: "Last eval" },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="d-flex gap-2 justify-content-end align-items-center">
          <Button
            size="sm"
            variant="outline-primary"
            onClick={() => navigate("/coach/evaluations", { state: { playerId: r.id } })}
          >
            Evaluate
          </Button>
          <RowActionsMenu label={`Actions for ${r.name}`}>
            <Dropdown.Item onClick={() => openEdit(r)}>Edit position / year</Dropdown.Item>
          </RowActionsMenu>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Roster" subtitle="Your players." />
      <ErrorAlert message={error} />
      {loading ? <Loading /> : <DataTable columns={columns} rows={roster} emptyMessage="No players on your roster yet." />}

      <Modal show={!!editing} onHide={() => setEditing(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">Edit {editing?.name}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditSave}>
          <Modal.Body>
            <ErrorAlert message={editError} />
            <Form.Group className="mb-3">
              <Form.Label>Position</Form.Label>
              <Form.Control
                value={editForm.position}
                onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                placeholder="Guard"
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Year</Form.Label>
              <Form.Control
                value={editForm.year}
                onChange={(e) => setEditForm({ ...editForm, year: e.target.value })}
                placeholder="Sophomore"
              />
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
    </div>
  );
}
