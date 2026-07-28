import { Doughnut, Bar } from "react-chartjs-2";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import { BarChart3, CalendarCheck, CalendarDays, ClipboardCheck, Dumbbell, Trophy } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { Loading, ErrorAlert } from "../../components/Feedback";
import StatCard from "../../components/StatCard";
import PageHeader from "../../components/PageHeader";
import { MSU_MAROON, NEUTRAL_FILL, TRIPLET_METRICS } from "../../chartPalette";

export default function PlayerDashboard() {
  const { data, loading, error } = useFetch("/player/dashboard");

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Your season at a glance." />
      <ErrorAlert message={error} />
      {loading && <Loading />}
      {data && (
        <>
          <Row className="g-3 mb-4">
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Attendance rate" value={`${data.attendance_rate}%`} icon={BarChart3} tone="maroon" />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Sessions attended" value={data.sessions_attended} icon={CalendarCheck} tone="gold" />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Upcoming sessions" value={data.upcoming_sessions} icon={CalendarDays} tone="teal" />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard
                label="Latest evaluation"
                value={data.latest_evaluation_avg != null ? `${data.latest_evaluation_avg}/5` : "—"}
                icon={ClipboardCheck}
                tone="blue"
              />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Activities" value={data.activities_completed} icon={Dumbbell} tone="maroon" />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Team rank" value={`#${data.overall_rank} of ${data.team_size}`} icon={Trophy} tone="gold" />
            </Col>
          </Row>

          <Row className="g-3">
            <Col md={5}>
              <Card className="h-100">
                <Card.Body>
                  <Card.Title className="h6">Attendance</Card.Title>
                  <Doughnut
                    data={{
                      labels: ["Attended", "Missed"],
                      datasets: [
                        {
                          data: [data.attendance_rate, Math.max(100 - data.attendance_rate, 0)],
                          backgroundColor: [MSU_MAROON, NEUTRAL_FILL],
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
                  <Card.Title className="h6">Activity</Card.Title>
                  <Bar
                    data={{
                      labels: ["Sessions attended", "Upcoming sessions", "Activities completed"],
                      datasets: [
                        {
                          label: "Count",
                          data: [data.sessions_attended, data.upcoming_sessions, data.activities_completed],
                          backgroundColor: TRIPLET_METRICS,
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
