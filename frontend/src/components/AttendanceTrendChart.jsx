import { useState } from "react";
import { Line } from "react-chartjs-2";
import Card from "react-bootstrap/Card";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Button from "react-bootstrap/Button";
import { MSU_MAROON } from "../chartPalette";

const RANGES = { "4W": 4, "8W": 8, "12W": 12 };

export default function AttendanceTrendChart({ points }) {
  const [range, setRange] = useState("12W");
  const weeks = RANGES[range];
  const slice = points.slice(-weeks);

  return (
    <Card className="h-100">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <Card.Title className="h6 mb-0">Attendance trend</Card.Title>
            <div className="text-muted small">Weekly average attendance rate</div>
          </div>
          <ButtonGroup size="sm">
            {Object.keys(RANGES).map((label) => (
              <Button key={label} variant={range === label ? "primary" : "outline-secondary"} onClick={() => setRange(label)}>
                {label}
              </Button>
            ))}
          </ButtonGroup>
        </div>
        <Line
          data={{
            labels: slice.map((p) => p.label),
            datasets: [
              {
                label: "Attendance %",
                data: slice.map((p) => p.value),
                borderColor: MSU_MAROON,
                backgroundColor: "rgba(165, 33, 66, 0.15)",
                fill: true,
                tension: 0.35,
                spanGaps: true,
                pointRadius: 3,
              },
            ],
          }}
          options={{
            plugins: { legend: { display: false } },
            scales: { y: { min: 0, max: 100, ticks: { callback: (v) => `${v}%` } } },
          }}
        />
      </Card.Body>
    </Card>
  );
}
