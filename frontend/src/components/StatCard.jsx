export default function StatCard({ label, value, hint, icon: Icon, tone = "maroon", trend, trendTone = "neutral" }) {
  return (
    <div className={`ab-stat-card ab-stat-card--${tone} h-100`}>
      <div className="d-flex align-items-start justify-content-between">
        {Icon && (
          <div className="ab-stat-icon">
            <Icon size={19} strokeWidth={2.25} />
          </div>
        )}
        {trend != null && <span className={`ab-stat-trend ab-stat-trend--${trendTone}`}>{trend}</span>}
      </div>
      <div className="ab-stat-label">{label}</div>
      <div className="ab-stat-value">{value}</div>
      {hint && <div className="text-muted small mt-1">{hint}</div>}
    </div>
  );
}
