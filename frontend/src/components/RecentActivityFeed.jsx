import Card from "react-bootstrap/Card";
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
          <ul className="ab-activity-feed">
            {items.map((item, i) => (
              <li key={i}>
                <div className="ab-activity-feed-row">
                  <span className="ab-activity-feed-actor">{item.actor}</span>
                  <span className={`ab-activity-badge ${ACTION_BADGE_CLASS[item.action] || ""}`}>{item.action}</span>
                  <span className="ab-activity-feed-when">{item.when}</span>
                </div>
                <div className="ab-activity-feed-detail">{item.detail}</div>
              </li>
            ))}
          </ul>
        )}
      </Card.Body>
    </Card>
  );
}
