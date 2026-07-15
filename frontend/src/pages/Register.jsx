import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import ToggleButton from "react-bootstrap/ToggleButton";
import { api } from "../api/client";
import { ErrorAlert } from "../components/Feedback";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "coach", label: "Coach" },
  { value: "player", label: "Player" },
];

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState("player");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sport, setSport] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const needsSport = role === "coach" || role === "player";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Fill in your name, email, and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (needsSport && !sport.trim()) {
      setError("Sport is required for coach and player accounts.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await api.post("/auth/register", {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        sport: needsSport ? sport.trim() : undefined,
      });
      navigate("/login", { state: { registered: true } });
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="ab-auth-shell">
      <Card className="ab-auth-card shadow-sm">
        <Card.Body className="p-4">
          <div className="text-center mb-4">
            <div className="fw-bold fs-4">Actibase</div>
            <div className="text-muted small">Create your account</div>
          </div>

          <ErrorAlert message={error} />

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>I am a…</Form.Label>
              <ButtonGroup className="w-100">
                {ROLES.map((r) => (
                  <ToggleButton
                    key={r.value}
                    id={`role-${r.value}`}
                    type="radio"
                    variant={role === r.value ? "primary" : "outline-primary"}
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={(e) => setRole(e.currentTarget.value)}
                  >
                    {r.label}
                  </ToggleButton>
                ))}
              </ButtonGroup>
            </Form.Group>

            <Form.Group className="mb-3" controlId="register-name">
              <Form.Label>Full name</Form.Label>
              <Form.Control value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Rivera" />
            </Form.Group>

            <Form.Group className="mb-3" controlId="register-email">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@actibase.edu"
              />
            </Form.Group>

            {needsSport && (
              <Form.Group className="mb-3" controlId="register-sport">
                <Form.Label>Sport</Form.Label>
                <Form.Control value={sport} onChange={(e) => setSport(e.target.value)} placeholder="Basketball" />
              </Form.Group>
            )}

            <Form.Group className="mb-4" controlId="register-password">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </Form.Group>

            <Button type="submit" variant="primary" className="w-100" disabled={submitting}>
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </Form>

          <div className="text-center mt-4 small">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
