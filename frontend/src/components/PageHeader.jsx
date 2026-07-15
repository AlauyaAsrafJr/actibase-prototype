export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
      <div>
        <h2 className="h4 mb-0">{title}</h2>
        {subtitle && <div className="text-muted small">{subtitle}</div>}
      </div>
      {actions && <div className="d-flex gap-2">{actions}</div>}
    </div>
  );
}
