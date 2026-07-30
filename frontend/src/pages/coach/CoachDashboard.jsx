import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { BarChart3, CalendarDays, ClipboardCheck, Dumbbell, FileText, Users } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { Loading, ErrorAlert } from "../../components/Feedback";
import StatCard from "../../components/StatCard";
import PageHeader from "../../components/PageHeader";
import DonutLegend from "../../components/DonutLegend";
import AttendanceTrendChart from "../../components/AttendanceTrendChart";
import RecentActivityFeed from "../../components/RecentActivityFeed";
import TopPlayersLeaderboard from "../../components/TopPlayersLeaderboard";
import { STATUS } from "../../chartPalette";
import { formatTrend } from "../../trendFormat";

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
              <StatCard label="Players" value={data.player_count} icon={Users} tone="maroon" {...formatTrend(data.players_trend)} />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Today's sessions" value={data.todays_sessions} icon={CalendarDays} tone="gold" />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Attendance rate" value={`${data.attendance_rate}%`} icon={BarChart3} tone="teal" {...formatTrend(data.attendance_rate_trend)} />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Pending evaluations" value={data.pending_evaluations} icon={ClipboardCheck} tone="blue" />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Upcoming training" value={data.upcoming_training} icon={Dumbbell} tone="maroon" />
            </Col>
            <Col xs={6} md={4} lg={2}>
              <StatCard label="Recent feedback" value={data.recent_feedback} icon={FileText} tone="gold" />
            </Col>
          </Row>

          <Row className="g-3 mb-3">
            <Col lg={7}>
              <AttendanceTrendChart points={data.attendance_trend} />
            </Col>
            <Col lg={5}>
              <DonutLegend
                title="Evaluation coverage"
                segments={[
                  { label: "Evaluated", value: Math.max(data.player_count - data.pending_evaluations, 0), color: STATUS.good },
                  { label: "Pending", value: data.pending_evaluations, color: STATUS.warning },
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
