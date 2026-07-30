import Card from "react-bootstrap/Card";
import Table from "react-bootstrap/Table";
import { EmptyState } from "./Feedback";

const ACTION_BADGE_CLASS = {
  "Posted announcement": "ab-activity-badge--info",
  "Completed session": "ab-activity-badge--good",
  "Submitted evaluation": "ab-activity-badge--good",
  "Generated report": "ab-activity-badge--info",
  "Archived record": "ab-activity-badge--warn",
};

export default function RecentActivityFeed({ items }) {
  return (
    <Card className="h-100">
      <Card.Body>
        <Card.Title className="h6">Recent activity</Card.Title>
        {items.length === 0 && <EmptyState message="Nothing recent yet." />}
        {items.length > 0 && (
          <Table responsive className="ab-activity-table align-middle mb-0">
            <thead>
              <tr>
                <th>Who</th>
                <th>Action</th>
                <th>Detail</th>
                <th className="text-end">When</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td>{item.actor}</td>
                  <td>
                    <span className={`ab-activity-badge ${ACTION_BADGE_CLASS[item.action] || ""}`}>{item.action}</span>
                  </td>
                  <td className="text-truncate" style={{ maxWidth: 220 }}>
                    {item.detail}
                  </td>
                  <td className="text-end text-muted">{item.when}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card.Body>
    </Card>
  );
}
