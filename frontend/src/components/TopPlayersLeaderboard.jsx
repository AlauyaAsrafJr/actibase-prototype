import Card from "react-bootstrap/Card";
import { EmptyState } from "./Feedback";

export default function TopPlayersLeaderboard({ players }) {
  return (
    <Card className="h-100">
      <Card.Body>
        <Card.Title className="h6">Top players</Card.Title>
        <div className="text-muted small mb-3">By average evaluation rating</div>
        {players.length === 0 && <EmptyState message="No evaluations yet." />}
        <ul className="ab-leaderboard">
          {players.map((p) => (
            <li key={p.player_id}>
              <span className="ab-leaderboard-avatar">{p.name[0]}</span>
              <div className="ab-leaderboard-info">
                <div className="ab-leaderboard-name">
                  {p.name} {p.position && <span className="text-muted fw-normal">· {p.position}</span>}
                </div>
                <div className="ab-leaderboard-bar-track">
                  <div className="ab-leaderboard-bar-fill" style={{ width: `${(p.avg_rating / 5) * 100}%` }} />
                </div>
              </div>
              <span className="ab-leaderboard-score">{p.avg_rating}/5</span>
            </li>
          ))}
        </ul>
      </Card.Body>
    </Card>
  );
}
