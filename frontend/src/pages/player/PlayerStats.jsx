import { Bar } from "react-chartjs-2";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import { Loading, ErrorAlert } from "../../components/Feedback";
import StatCard from "../../components/StatCard";
import PageHeader from "../../components/PageHeader";
import { MSU_MAROON, NEUTRAL_FILL } from "../../chartPalette";

export default function PlayerStats() {
  const { data, loading, error } = useFetch("/player/stats");
  const { user } = useAuth();

  return (
    <div>
      <PageHeader title="Team stats" subtitle="How you compare with your teammates." />
      <ErrorAlert message={error} />
      {loading && <Loading />}
      {data && (
        <>
          <Row className="g-3 mb-4">
            <Col xs={6} md={3}>
              <StatCard label="Attendance rate" value={`${data.attendance_rate}%`} />
            </Col>
            <Col xs={6} md={3}>
              <StatCard label="Sessions attended" value={data.sessions_attended} />
            </Col>
            <Col xs={6} md={3}>
              <StatCard label="Avg. evaluation" value={`${data.avg_evaluation}/5`} />
            </Col>
            <Col xs={6} md={3}>
              <StatCard label="Team rank" value={`#${data.team_rank} of ${data.team_size}`} />
            </Col>
          </Row>

          <Card>
            <Card.Body>
              <Card.Title className="h6">Team attendance</Card.Title>
              <Bar
                data={{
                  labels: data.teammates.map((t) => t.name),
                  datasets: [
                    {
                      label: "Attendance %",
                      data: data.teammates.map((t) => t.attendance_pct),
                      backgroundColor: data.teammates.map((t) => (t.name === user?.name ? MSU_MAROON : NEUTRAL_FILL)),
                      borderRadius: 4,
                    },
                  ],
                }}
                options={{
                  indexAxis: "y",
                  plugins: { legend: { display: false } },
                  scales: { x: { beginAtZero: true, max: 100 } },
                }}
              />
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
}
