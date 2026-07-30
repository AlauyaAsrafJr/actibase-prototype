import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";
import { Archive, CalendarDays, FileText, UserCircle, UserRound, Users } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { Loading, ErrorAlert } from "../../components/Feedback";
import StatCard from "../../components/StatCard";
import PageHeader from "../../components/PageHeader";
import DonutLegend from "../../components/DonutLegend";
import AttendanceTrendChart from "../../components/AttendanceTrendChart";
import RecentActivityFeed from "../../components/RecentActivityFeed";
import TopPlayersLeaderboard from "../../components/TopPlayersLeaderboard";
import { TRIPLET_IDENTITY } from "../../chartPalette";
import { formatTrend } from "../../trendFormat";

function HealthBadge() {
  const { data: health } = useFetch("/admin/health");
  if (!health) return null;
  const ok = health.database === "connected";
  return (
    <Badge bg={ok ? "success" : "danger"} className="fw-normal">
      Database: {ok ? "connected" : "error"}
    </Badge>
  );
}

export default function AdminDashboard() {
  const { data, loading, error } = useFetch("/admin/dashboard");

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Program-wide overview across every sport." actions={<HealthBadge />} />
      <ErrorAlert message={error} />
      {loading && <Loading />}
      {data && (
        <>
          <Row className="g-3 mb-4">
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Players" value={data.total_players} icon={UserRound} tone="maroon" {...formatTrend(data.players_trend)} />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Coaches" value={data.total_coaches} icon={Users} tone="gold" {...formatTrend(data.coaches_trend)} />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Active accounts" value={data.total_users_active} icon={UserCircle} tone="teal" {...formatTrend(data.active_trend)} />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Sessions" value={data.total_sessions} icon={CalendarDays} tone="blue" {...formatTrend(data.sessions_trend)} />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Reports" value={data.total_reports} icon={FileText} tone="maroon" {...formatTrend(data.reports_trend)} />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Archived" value={data.archived_records} icon={Archive} tone="gold" {...formatTrend(data.archived_trend)} />
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col lg={7}>
              <AttendanceTrendChart points={data.attendance_trend} />
            </Col>
            <Col lg={5}>
              <DonutLegend
                title="Roster breakdown"
                segments={[
                  { label: "Players", value: data.total_players, color: TRIPLET_IDENTITY[0] },
                  { label: "Coaches", value: data.total_coaches, color: TRIPLET_IDENTITY[1] },
                  { label: "Active staff/admin", value: Math.max(data.total_users_active - data.total_coaches, 0), color: TRIPLET_IDENTITY[2] },
                ]}
              />
            </Col>
          </Row>

          <Row className="g-3">
            <Col lg={7}>
              <RecentActivityFeed items={data.recent_activity} />
            </Col>
            <Col lg={5}>
              <TopPlayersLeaderboard players={data.top_players} />
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
