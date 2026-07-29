import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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

const RATING_FIELDS = ["skill", "effort", "teamwork", "attitude"];

const EMPTY_FORM = { player_id: "", skill: 3, effort: 3, teamwork: 3, attitude: 3, comment: "" };

function RatingSliders({ form, setForm }) {
  return RATING_FIELDS.map((field) => (
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
  ));
}

export default function CoachEvaluations() {
  const { data: evaluations, loading, error, reload } = useFetch("/coach/evaluations");
  const { data: roster } = useFetch("/coach/roster");
  const location = useLocation();
  const navigate = useNavigate();

  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editing, setEditing] = useState(null); // evaluation row | null
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function openModal(playerId) {
    setForm({ ...EMPTY_FORM, player_id: playerId ?? roster?.[0]?.id ?? "" });
    setFormError("");
    setShow(true);
  }

  // Arriving from Roster's "Evaluate" shortcut with a player pre-picked.
  useEffect(() => {
    const requestedPlayerId = location.state?.playerId;
    if (requestedPlayerId && roster?.length) {
      openModal(requestedPlayerId);
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, roster]);

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

  function openEdit(r) {
    setEditing(r);
    setEditForm({ ...r });
    setEditError("");
  }

  async function handleEditSave(e) {
    e.preventDefault();
    setEditError("");
    setSavingEdit(true);
    try {
      await api.patch(`/coach/evaluations/${editing.id}`, {
        skill: editForm.skill,
        effort: editForm.effort,
        teamwork: editForm.teamwork,
        attitude: editForm.attitude,
        comment: editForm.comment,
      });
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
      await api.delete(`/coach/evaluations/${deleteTarget.id}`);
      setDeleteTarget(null);
      reload();
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    { key: "player_name", label: "Player" },
    { key: "date", label: "Date" },
    { key: "skill", label: "Skill" },
    { key: "effort", label: "Effort" },
    { key: "teamwork", label: "Teamwork" },
    { key: "attitude", label: "Attitude" },
    {
      key: "overall",
      label: "Overall",
      render: (r) => <Badge bg={r.overall >= 4 ? "success" : r.overall >= 3 ? "warning" : "danger"}>{r.overall}/5</Badge>,
    },
    { key: "comment", label: "Comment", render: (r) => r.comment || "—" },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <RowActionsMenu label={`Actions for ${r.player_name}'s evaluation on ${r.date}`}>
          <Dropdown.Item onClick={() => openEdit(r)}>Edit</Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item className="text-danger" onClick={() => setDeleteTarget(r)}>
            Delete
          </Dropdown.Item>
        </RowActionsMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Evaluations"
        subtitle="Player performance evaluations."
        actions={
          <Button size="sm" onClick={() => openModal()} disabled={!roster?.length}>
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

            <RatingSliders form={form} setForm={setForm} />

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

      <Modal show={!!editing} onHide={() => setEditing(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">Edit evaluation — {editing?.player_name}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditSave}>
          <Modal.Body>
            <ErrorAlert message={editError} />
            <RatingSliders form={editForm} setForm={setEditForm} />
            <Form.Group>
              <Form.Label>Comment</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={editForm.comment}
                onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })}
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

      <ConfirmModal
        show={!!deleteTarget}
        title="Delete evaluation"
        body={`Permanently delete this evaluation for ${deleteTarget?.player_name} (${deleteTarget?.date})? This can't be undone.`}
        confirmLabel="Delete"
        variant="danger"
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
