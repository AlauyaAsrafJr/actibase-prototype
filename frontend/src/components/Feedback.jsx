import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/Alert";

export function Loading({ label = "Loading…" }) {
  return (
    <div className="d-flex align-items-center gap-2 text-muted py-4">
      <Spinner animation="border" size="sm" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorAlert({ message }) {
  if (!message) return null;
  return (
    <Alert variant="danger" className="mb-3">
      {message}
    </Alert>
  );
}

export function EmptyState({ message }) {
  return <div className="text-muted text-center py-5 border rounded bg-white">{message}</div>;
}
