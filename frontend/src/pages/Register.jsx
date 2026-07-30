import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import ToggleButton from "react-bootstrap/ToggleButton";
import { Lock, Mail, User } from "lucide-react";
import { api } from "../api/client";
import { ErrorAlert } from "../components/Feedback";
import AuthIllustration from "../components/AuthIllustration";
import VarsityCrest from "../components/VarsityCrest";

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
      <div className="ab-auth-illustration d-none d-md-flex">
        <AuthIllustration />
      </div>
      <div className="ab-auth-form-side">
        <div className="ab-auth-card">
          <div className="ab-auth-icon">
            <VarsityCrest compact size={40} />
          </div>
          <div className="text-center mb-4">
            <div className="fw-bold fs-4">Create your account</div>
            <div className="text-muted small">Join Actibase as an admin, coach, or player.</div>
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
              <div className="ab-input-icon-group">
                <User size={16} />
                <Form.Control value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Rivera" />
              </div>
            </Form.Group>

            <Form.Group className="mb-3" controlId="register-email">
              <Form.Label>Email</Form.Label>
              <div className="ab-input-icon-group">
                <Mail size={16} />
                <Form.Control
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@actibase.edu"
                />
              </div>
            </Form.Group>

            {needsSport && (
              <Form.Group className="mb-3" controlId="register-sport">
                <Form.Label>Sport</Form.Label>
                <Form.Control value={sport} onChange={(e) => setSport(e.target.value)} placeholder="Basketball" />
              </Form.Group>
            )}

            <Form.Group className="mb-4" controlId="register-password">
              <Form.Label>Password</Form.Label>
              <div className="ab-input-icon-group">
                <Lock size={16} />
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
            </Form.Group>

            <Button type="submit" variant="primary" className="w-100" disabled={submitting}>
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </Form>

          <div className="text-center mt-4 small">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
