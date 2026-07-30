import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";
import { useFetch } from "../../hooks/useFetch";
import { Loading, ErrorAlert, EmptyState } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";

export default function PlayerAnnouncements() {
  const { data: announcements, loading, error } = useFetch("/player/announcements");

  return (
    <div>
      <PageHeader title="Announcements" subtitle="Updates from your coach and the program." />
      <ErrorAlert message={error} />
      {loading && <Loading />}
      {!loading && (!announcements || announcements.length === 0) && <EmptyState message="No announcements yet." />}
      <div className="d-flex flex-column gap-3">
        {announcements?.map((a) => (
          <Card key={a.id}>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-1 gap-2">
                <Card.Title className="h6 mb-0">{a.title}</Card.Title>
                <Badge bg="secondary" className="fw-normal flex-shrink-0">
                  {a.audience}
                </Badge>
              </div>
              <div className="text-muted small mb-2">
                {a.author_name} · {a.posted_date}
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>{a.body}</div>
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  );
}
