import { Doughnut, Bar } from "react-chartjs-2";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import { useFetch } from "../../hooks/useFetch";
import { Loading, ErrorAlert } from "../../components/Feedback";
import StatCard from "../../components/StatCard";
import PageHeader from "../../components/PageHeader";

export default function AdminDashboard() {
  const { data, loading, error } = useFetch("/admin/dashboard");

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Program-wide overview across every sport." />
      <ErrorAlert message={error} />
      {loading && <Loading />}
      {data && (
        <>
          <Row className="g-3 mb-4">
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Players" value={data.total_players} />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Coaches" value={data.total_coaches} />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Active accounts" value={data.total_users_active} />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Sessions" value={data.total_sessions} />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Reports" value={data.total_reports} />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Archived" value={data.archived_records} />
            </Col>
          </Row>

          <Row className="g-3">
            <Col md={5}>
              <Card className="h-100">
                <Card.Body>
                  <Card.Title className="h6">People</Card.Title>
                  <Doughnut
                    data={{
                      labels: ["Players", "Coaches", "Active staff/admin"],
                      datasets: [
                        {
                          data: [
                            data.total_players,
                            data.total_coaches,
                            Math.max(data.total_users_active - data.total_coaches, 0),
                          ],
                          backgroundColor: ["#0d6efd", "#20c997", "#ffc107"],
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
                  <Card.Title className="h6">Program activity</Card.Title>
                  <Bar
                    data={{
                      labels: ["Sessions", "Reports", "Archived records"],
                      datasets: [
                        {
                          label: "Count",
                          data: [data.total_sessions, data.total_reports, data.archived_records],
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
