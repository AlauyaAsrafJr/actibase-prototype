import { Doughnut, Bar } from "react-chartjs-2";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import { useFetch } from "../../hooks/useFetch";
import { Loading, ErrorAlert } from "../../components/Feedback";
import StatCard from "../../components/StatCard";
import PageHeader from "../../components/PageHeader";

export default function CoachDashboard() {
  const { data, loading, error } = useFetch("/coach/dashboard");

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Your team at a glance." />
      <ErrorAlert message={error} />
      {loading && <Loading />}
      {data && (
        <>
          <Row className="g-3 mb-4">
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Players" value={data.player_count} />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Today's sessions" value={data.todays_sessions} />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Attendance rate" value={`${data.attendance_rate}%`} />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Pending evaluations" value={data.pending_evaluations} />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Upcoming training" value={data.upcoming_training} />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Recent feedback" value={data.recent_feedback} />
            </Col>
          </Row>

          <Row className="g-3">
            <Col md={5}>
              <Card className="h-100">
                <Card.Body>
                  <Card.Title className="h6">Evaluation coverage</Card.Title>
                  <Doughnut
                    data={{
                      labels: ["Evaluated", "Pending"],
                      datasets: [
                        {
                          data: [
                            Math.max(data.player_count - data.pending_evaluations, 0),
                            data.pending_evaluations,
                          ],
                          backgroundColor: ["#20c997", "#ffc107"],
                        },
                      ],
                    }}
                    options={{ plugins: { legend: { position: "bottom" } } }}
                  />
                </Card.Body>
              </Card>
            </Col>
            <Col md={7}>
              <Card className="h-100">
                <Card.Body>
                  <Card.Title className="h6">This week</Card.Title>
                  <Bar
                    data={{
                      labels: ["Today's sessions", "Upcoming training", "Recent feedback"],
                      datasets: [
                        {
                          label: "Count",
                          data: [data.todays_sessions, data.upcoming_training, data.recent_feedback],
                          backgroundColor: "#0d6efd",
                          borderRadius: 4,
                        },
                      ],
                    }}
                    options={{
                      plugins: { legend: { display: false } },
                      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                    }}
                  />
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
