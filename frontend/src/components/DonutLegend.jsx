import { Doughnut } from "react-chartjs-2";
import Card from "react-bootstrap/Card";

export default function DonutLegend({ title, segments }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  return (
    <Card className="h-100">
      <Card.Body>
        <Card.Title className="h6">{title}</Card.Title>
        <div className="d-flex align-items-center gap-4">
          <div style={{ width: 150, height: 150, flexShrink: 0 }}>
            <Doughnut
              data={{
                labels: segments.map((s) => s.label),
                datasets: [{ data: segments.map((s) => s.value), backgroundColor: segments.map((s) => s.color), borderWidth: 0 }],
              }}
              options={{ plugins: { legend: { display: false } }, cutout: "68%" }}
            />
          </div>
          <ul className="ab-donut-legend flex-grow-1">
            {segments.map((s) => (
              <li key={s.label}>
                <span className="ab-donut-legend-dot" style={{ backgroundColor: s.color }} />
                <span className="ab-donut-legend-label">{s.label}</span>
                <span className="ab-donut-legend-pct">
                  {s.value} · {total ? Math.round((s.value / total) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Card.Body>
    </Card>
  );
}
