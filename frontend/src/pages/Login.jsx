import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ErrorAlert } from "../components/Feedback";
import AuthIllustration from "../components/AuthIllustration";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Enter your email and password to continue.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password, remember);
      navigate(`/${user.role}`, { replace: true });
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
            <img src="/msu-logo.png" alt="Mindanao State University" width={34} height={42} />
          </div>
          <div className="text-center mb-4">
            <div className="fw-bold fs-4">Welcome back</div>
            <div className="text-muted small">Sign in to manage your team, roster, and season.</div>
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
              <div className="ab-input-icon-group">
                <Mail size={16} />
                <Form.Control
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@actibase.edu"
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-3" controlId="login-password">
              <Form.Label>Password</Form.Label>
              <div className="ab-input-icon-group">
                <Lock size={16} />
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingRight: "2.5rem" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="btn btn-link p-0 border-0"
                  style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#a8a29e" }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Form.Group>

            <div className="d-flex justify-content-between align-items-center mb-4">
              <Form.Check
                type="checkbox"
                id="login-remember"
                label="Remember me"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="small"
              />
              <button
                type="button"
                className="btn btn-link btn-sm p-0 text-decoration-none"
                onClick={() => setShowForgot(true)}
              >
                Forgot password?
              </button>
            </div>

            {showForgot && (
              <Alert variant="secondary" className="small py-2" dismissible onClose={() => setShowForgot(false)}>
                Password reset isn&apos;t available in this demo yet — contact your administrator.
              </Alert>
            )}

            <Button type="submit" variant="primary" className="w-100" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </Form>

          <div className="text-center mt-4 small">
            Don&apos;t have an account? <Link to="/register">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
