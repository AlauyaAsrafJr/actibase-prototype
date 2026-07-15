export default function StatCard({ label, value, hint }) {
  return (
    <div className="ab-stat-card p-3 h-100">
      <div className="ab-stat-label">{label}</div>
      <div className="ab-stat-value">{value}</div>
      {hint && <div className="text-muted small mt-1">{hint}</div>}
    </div>
  );
}
