import ProgressBar from "react-bootstrap/ProgressBar";

export default function AttendanceBar({ value }) {
  const variant = value >= 80 ? "success" : value >= 50 ? "warning" : "danger";
  return (
    <div className="ab-attendance-bar" style={{ maxWidth: 140 }}>
      <ProgressBar now={value} variant={variant} />
      <span className="ab-attendance-bar-label">{value}%</span>
    </div>
  );
}
