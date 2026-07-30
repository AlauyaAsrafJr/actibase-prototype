import { useRef, useState } from "react";
import Button from "react-bootstrap/Button";
import { api, BASE_URL } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ErrorAlert } from "./Feedback";

export default function ProfilePhotoUploader({ photoUrl, name, uploadPath, onChange }) {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const updated = await api.upload(uploadPath, formData);
      onChange(updated);
      if (user) updateUser({ ...user, photo_url: updated.photo_url });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setError("");
    setBusy(true);
    try {
      const updated = await api.delete(uploadPath);
      onChange(updated);
      if (user) updateUser({ ...user, photo_url: null });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4">
      <div className="d-flex align-items-center gap-3">
        <div className="ab-profile-avatar">
          {photoUrl ? <img src={`${BASE_URL}${photoUrl}`} alt={name} /> : <span>{name?.[0]?.toUpperCase() ?? "?"}</span>}
        </div>
        <div>
          <div className="d-flex gap-2">
            <Button size="sm" variant="outline-secondary" onClick={() => fileInputRef.current?.click()} disabled={busy}>
              {busy ? "Uploading…" : "Upload photo"}
            </Button>
            {photoUrl && (
              <Button size="sm" variant="outline-danger" onClick={handleRemove} disabled={busy}>
                Remove
              </Button>
            )}
          </div>
          <div className="text-muted small mt-1">PNG, JPEG, or WEBP. Max 5 MB.</div>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="d-none" onChange={handleFileChange} />
        </div>
      </div>
      {error && <ErrorAlert message={error} />}
    </div>
  );
}
