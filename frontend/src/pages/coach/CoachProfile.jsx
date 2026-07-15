import { useEffect, useState } from "react";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../api/client";
import { Loading, ErrorAlert } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";

const FIELDS = ["name", "sport", "email", "phone", "bio", "years_coaching"];

export default function CoachProfile() {
  const { data: profile, loading, error } = useFetch("/coach/profile");
  const [form, setForm] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  async function handleSave(e) {
    e.preventDefault();
    setSaveError("");
    setSaved(false);
    setSaving(true);
    try {
      const payload = Object.fromEntries(FIELDS.map((f) => [f, form[f]]));
      const updated = await api.patch("/coach/profile", payload);
      setForm(updated);
      setSaved(true);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Profile" subtitle="Your coach account." />
      <ErrorAlert message={error} />
      {loading && <Loading />}
      {form && (
        <Card style={{ maxWidth: 560 }}>
          <Card.Body>
            {saved && <Alert variant="success">Profile updated.</Alert>}
            <ErrorAlert message={saveError} />
            <Form onSubmit={handleSave}>
              <Form.Group className="mb-3">
                <Form.Label>Name</Form.Label>
                <Form.Control value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Sport</Form.Label>
                <Form.Control value={form.sport || ""} onChange={(e) => setForm({ ...form, sport: e.target.value })} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Phone</Form.Label>
                <Form.Control value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Years coaching</Form.Label>
                <Form.Control
                  value={form.years_coaching || ""}
                  onChange={(e) => setForm({ ...form, years_coaching: e.target.value })}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Bio</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={form.bio || ""}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </Form.Group>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
