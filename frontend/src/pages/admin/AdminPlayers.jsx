import { useEffect, useMemo, useState } from "react";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Alert from "react-bootstrap/Alert";
import Dropdown from "react-bootstrap/Dropdown";
import ProgressBar from "react-bootstrap/ProgressBar";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../api/client";
import { Loading, ErrorAlert } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/DataTable";
import ConfirmModal from "../../components/ConfirmModal";
import RowActionsMenu from "../../components/RowActionsMenu";
import SearchInput from "../../components/SearchInput";

const STATUS_VARIANT = { Active: "success", Inactive: "secondary", Archived: "dark" };
const EMPTY_FORM = { lastName: "", firstName: "", middleName: "", email: "", coach_id: "", position: "", year: "" };

function NameFields({ form, setForm }) {
  return (
    <>
      <Form.Group className="mb-3">
        <Form.Label>Last name</Form.Label>
        <Form.Control value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>First name</Form.Label>
        <Form.Control value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Middle name</Form.Label>
        <Form.Control value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} placeholder="Optional" />
      </Form.Group>
    </>
  );
}

function CoachAndPositionFields({ form, setForm, coaches }) {
  return (
    <>
      <Form.Group className="mb-3">
        <Form.Label>Coach</Form.Label>
        <Form.Select value={form.coach_id} onChange={(e) => setForm({ ...form, coach_id: e.target.value })}>
          <option value="">Unassigned</option>
          {coaches?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.sport ? ` — ${c.sport}` : ""}
            </option>
          ))}
        </Form.Select>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Position</Form.Label>
        <Form.Control value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Guard" />
      </Form.Group>
      <Form.Group>
        <Form.Label>Year</Form.Label>
        <Form.Control value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="Sophomore" />
      </Form.Group>
    </>
  );
}

export default function AdminPlayers() {
  const { data: players, loading, error, reload } = useFetch("/admin/players");
  const { data: coaches } = useFetch("/admin/coaches");
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [sport, setSport] = useState("all");
  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  const [editing, setEditing] = useState(null); // player row | null
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const sports = useMemo(() => {
    if (!players) return [];
    return [...new Set(players.map((p) => p.sport).filter(Boolean))].sort();
  }, [players]);

  const filtered = useMemo(() => {
    if (!players) return [];
    const bySport = sport === "all" ? players : players.filter((p) => p.sport === sport);
    if (!search.trim()) return bySport;
    const q = search.trim().toLowerCase();
    return bySport.filter((p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
  }, [players, sport, search]);

  const [selected, setSelected] = useState(() => new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    if (!players) return;
    setSelected((prev) => {
      const ids = new Set(players.map((p) => p.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [players]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelected((prev) => {
      if (allFilteredSelected) {
        const next = new Set(prev);
        filtered.forEach((p) => next.delete(p.id));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach((p) => next.add(p.id));
      return next;
    });
  }

  async function handleBulkArchive() {
    setBulkBusy(true);
    try {
      await api.post("/admin/players/archive-bulk", { ids: [...selected] });
      setSelected(new Set());
      setBulkConfirm(false);
      reload();
    } finally {
      setBulkBusy(false);
    }
  }

  function payloadFrom(form) {
    return {
      first_name: form.firstName.trim(),
      middle_name: form.middleName.trim(),
      last_name: form.lastName.trim(),
      email: form.email.trim(),
      coach_id: form.coach_id ? Number(form.coach_id) : null,
      position: form.position.trim() || null,
      year: form.year.trim() || null,
    };
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!createForm.firstName.trim() || !createForm.lastName.trim() || !createForm.email.trim()) {
      setCreateError("First name, last name, and email are required.");
      return;
    }
    setCreateError("");
    setCreating(true);
    try {
      await api.post("/admin/players", payloadFrom(createForm));
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      reload();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function openEdit(r) {
    setEditing(r);
    setEditForm({
      lastName: r.last_name,
      firstName: r.first_name,
      middleName: r.middle_name || "",
      email: r.email,
      coach_id: r.coach_id != null ? String(r.coach_id) : "",
      position: r.position || "",
      year: r.year || "",
    });
    setEditError("");
  }

  async function handleEditSave(e) {
    e.preventDefault();
    if (!editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.email.trim()) {
      setEditError("First name, last name, and email are required.");
      return;
    }
    setEditError("");
    setSavingEdit(true);
    try {
      await api.patch(`/admin/players/${editing.id}`, payloadFrom(editForm));
      setEditing(null);
      reload();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleConfirm() {
    if (!confirmTarget) return;
    setBusy(true);
    try {
      if (confirmTarget.action === "archive") {
        await api.post(`/admin/players/${confirmTarget.id}/archive`);
      } else if (confirmTarget.action === "reset") {
        const result = await api.post(`/admin/players/${confirmTarget.id}/reset-password`);
        setNotice(`${confirmTarget.name}'s password was reset to "${result.new_password}".`);
      } else {
        await api.delete(`/admin/players/${confirmTarget.id}`);
      }
      setConfirmTarget(null);
      reload();
    } finally {
      setBusy(false);
    }
  }

  const CONFIRM_COPY = {
    delete: { title: "Delete player", body: `Permanently delete ${confirmTarget?.name}? This can't be undone.`, label: "Delete", variant: "danger" },
    archive: { title: "Archive player", body: `Archive ${confirmTarget?.name}? They'll be moved to the archive and can be restored later.`, label: "Archive", variant: "secondary" },
    reset: { title: "Reset password", body: `Reset ${confirmTarget?.name}'s password to the default ("changeme")?`, label: "Reset", variant: "secondary" },
  };
  const confirmCopy = confirmTarget ? CONFIRM_COPY[confirmTarget.action] : null;

  const columns = [
    {
      key: "select",
      label: <Form.Check checked={allFilteredSelected} onChange={toggleAllFiltered} aria-label="Select all" />,
      render: (r) => <Form.Check checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} aria-label={`Select ${r.name}`} />,
    },
    { key: "name", label: "Name" },
    { key: "sport", label: "Sport" },
    { key: "coach_name", label: "Coach", render: (r) => r.coach_name || "—" },
    { key: "position", label: "Position", render: (r) => r.position || "—" },
    { key: "year", label: "Year", render: (r) => r.year || "—" },
    {
      key: "attendance_pct",
      label: "Attendance",
      render: (r) => (
        <div style={{ maxWidth: 140 }}>
          <ProgressBar
            now={r.attendance_pct}
            label={`${r.attendance_pct}%`}
            variant={r.attendance_pct >= 80 ? "success" : r.attendance_pct >= 50 ? "warning" : "danger"}
          />
        </div>
      ),
    },
    { key: "last_eval", label: "Last eval" },
    {
      key: "status",
      label: "Status",
      render: (r) => <Badge bg={STATUS_VARIANT[r.status] || "secondary"}>{r.status}</Badge>,
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <div className="text-end">
          <RowActionsMenu label={`Actions for ${r.name}`}>
            <Dropdown.Item onClick={() => openEdit(r)}>Edit</Dropdown.Item>
            <Dropdown.Item onClick={() => setConfirmTarget({ id: r.id, action: "reset", name: r.name })}>
              Reset password
            </Dropdown.Item>
            <Dropdown.Item onClick={() => setConfirmTarget({ id: r.id, action: "archive", name: r.name })}>
              Archive
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item
              className="text-danger"
              onClick={() => setConfirmTarget({ id: r.id, action: "delete", name: r.name })}
            >
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
        title="Players"
        subtitle="Every player across every sport, program-wide."
        actions={
          <div className="d-flex gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by name or email…" style={{ width: 220 }} />
            <Form.Select size="sm" style={{ width: 180 }} value={sport} onChange={(e) => setSport(e.target.value)}>
              <option value="all">All sports</option>
              {sports.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Form.Select>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              New player
            </Button>
          </div>
        }
      />
      {notice && (
        <Alert variant="success" dismissible onClose={() => setNotice("")} className="mb-3">
          {notice}
        </Alert>
      )}
      <ErrorAlert message={error} />
      {selected.size > 0 && (
        <div className="d-flex align-items-center gap-2 mb-2 p-2 bg-light border rounded">
          <span className="small text-muted">{selected.size} selected</span>
          <Button size="sm" variant="outline-secondary" onClick={() => setBulkConfirm(true)}>
            Archive selected
          </Button>
          <Button size="sm" variant="link" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}
      {loading ? <Loading /> : <DataTable columns={columns} rows={filtered} emptyMessage="No players match these filters." />}

      <Modal show={showCreate} onHide={() => setShowCreate(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">New player</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreate}>
          <Modal.Body>
            <ErrorAlert message={createError} />
            <NameFields form={createForm} setForm={setCreateForm} />
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </Form.Group>
            <CoachAndPositionFields form={createForm} setForm={setCreateForm} coaches={coaches} />
            <div className="text-muted small mt-3">New accounts get the default password &quot;changeme&quot;.</div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowCreate(false)} disabled={creating}>
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create player"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={!!editing} onHide={() => setEditing(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">Edit {editing?.name}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleEditSave}>
          <Modal.Body>
            <ErrorAlert message={editError} />
            <NameFields form={editForm} setForm={setEditForm} />
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </Form.Group>
            <CoachAndPositionFields form={editForm} setForm={setEditForm} coaches={coaches} />
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
        show={!!confirmTarget}
        title={confirmCopy?.title}
        body={confirmCopy?.body}
        confirmLabel={confirmCopy?.label}
        variant={confirmCopy?.variant}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmTarget(null)}
      />

      <ConfirmModal
        show={bulkConfirm}
        title="Archive selected players"
        body={`Archive ${selected.size} selected player(s)? They'll be moved to the archive and can be restored later.`}
        confirmLabel="Archive"
        variant="secondary"
        busy={bulkBusy}
        onConfirm={handleBulkArchive}
        onCancel={() => setBulkConfirm(false)}
      />
    </div>
  );
}
