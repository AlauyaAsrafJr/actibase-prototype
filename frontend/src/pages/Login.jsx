import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import { useAuth } from "../context/AuthContext";
import { ErrorAlert } from "../components/Feedback";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password to continue.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      navigate(`/${user.role}`, { replace: true });
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
            <div className="text-muted small">Sign in to your dashboard</div>
          </div>

          {location.state?.registered && !error && (
            <Alert variant="success" className="mb-3">
              Account created — sign in to continue.
            </Alert>
          )}
          <ErrorAlert message={error} />

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="login-email">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@actibase.edu"
              />
            </Form.Group>

            <Form.Group className="mb-4" controlId="login-password">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Form.Group>

            <Button type="submit" variant="primary" className="w-100" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </Form>

          <div className="text-center mt-4 small">
            Don&apos;t have an account? <Link to="/register">Create one</Link>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
