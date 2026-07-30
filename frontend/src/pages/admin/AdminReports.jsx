import { useMemo, useState } from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Badge from "react-bootstrap/Badge";
import Card from "react-bootstrap/Card";
import { Bar } from "react-chartjs-2";
import { CalendarDays, CalendarRange, FileText, Trophy } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../api/client";
import { Loading, ErrorAlert, EmptyState } from "../../components/Feedback";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import DataTable from "../../components/DataTable";
import { formatTrend } from "../../trendFormat";
import { MSU_MAROON } from "../../chartPalette";

const REPORT_RANGES = ["Last 7 days", "Last 30 days", "All time"];

export default function AdminReports() {
  const { data: reports, loading, error, reload } = useFetch("/admin/reports");
  const { data: summary } = useFetch("/admin/reports/summary");
  const { data: seasons } = useFetch("/admin/seasons");
  const [sport, setSport] = useState("all");
  const [search, setSearch] = useState("");
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [newSport, setNewSport] = useState("");
  const [range, setRange] = useState(REPORT_RANGES[2]);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [viewing, setViewing] = useState(null);

  const sports = useMemo(() => {
    if (!reports) return [];
    return [...new Set(reports.map((r) => r.sport).filter((s) => s && s !== "All sports"))].sort();
  }, [reports]);

  const filtered = useMemo(() => {
    if (!reports) return [];
    const bySport = sport === "all" ? reports : reports.filter((r) => r.sport === sport);
    if (!search.trim()) return bySport;
    const q = search.trim().toLowerCase();
    return bySport.filter((r) => r.name.toLowerCase().includes(q));
  }, [reports, sport, search]);

  const recentReports = useMemo(() => (reports || []).slice(0, 5), [reports]);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      const payload = { name: name.trim() || undefined, sport: newSport.trim() || undefined };
      if (range.startsWith("season:")) payload.season_id = Number(range.slice("season:".length));
      else payload.range = range;
      await api.post("/admin/reports", payload);
      setShow(false);
      setName("");
      setNewSport("");
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExport() {
    setExportError("");
    setExporting(true);
    try {
      const query = sport === "all" ? "" : `?sport=${encodeURIComponent(sport)}`;
      await api.download(`/admin/reports/export${query}`, "actibase-reports.csv");
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExporting(false);
    }
  }

  const columns = [
    { key: "name", label: "Name" },
    { key: "sport", label: "Sport" },
    { key: "range", label: "Range" },
    { key: "generated_on", label: "Generated" },
    {
      key: "status",
      label: "Status",
      render: (r) => <Badge bg={r.status === "Ready" ? "success" : "warning"}>{r.status}</Badge>,
    },
    {
      key: "actions",
      label: "",
      render: (r) => (
        <Button size="sm" variant="outline-secondary" onClick={() => setViewing(r)}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Generate, view, and export reports across every sport."
        actions={
          <div className="d-flex gap-2">
            <Button size="sm" variant="outline-secondary" onClick={handleExport} disabled={exporting || !reports?.length}>
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
            <Button size="sm" onClick={() => setShow(true)}>
              Generate report
            </Button>
          </div>
        }
      />
      <ErrorAlert message={error} />
      <ErrorAlert message={exportError} />

      {summary && (
        <Row className="g-3 mb-4">
          <Col xs={6} md={3}>
            <StatCard label="Total reports" value={summary.total} icon={FileText} tone="maroon" {...formatTrend(summary.total_trend)} />
          </Col>
          <Col xs={6} md={3}>
            <StatCard label="This month" value={summary.this_month} icon={CalendarDays} tone="gold" />
          </Col>
          <Col xs={6} md={3}>
            <StatCard label="This term" value={summary.this_term ?? "—"} icon={CalendarRange} tone="teal" />
          </Col>
          <Col xs={6} md={3}>
            <StatCard label="Sports covered" value={summary.sports_covered} icon={Trophy} tone="blue" />
          </Col>
        </Row>
      )}

      <Row className="g-3">
        <Col lg={7}>
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                <Card.Title className="h6 mb-0">Report library</Card.Title>
                <div className="d-flex gap-2">
                  <Form.Select size="sm" style={{ width: 160 }} value={sport} onChange={(e) => setSport(e.target.value)}>
                    <option value="all">All sports</option>
                    {sports.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Control size="sm" style={{ width: 180 }} placeholder="Find report…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
              {loading ? <Loading /> : <DataTable columns={columns} rows={filtered} emptyMessage="No reports match these filters." />}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={5}>
          <Card className="mb-3">
            <Card.Body>
              <Card.Title className="h6">Reports by sport</Card.Title>
              {(!summary || summary.by_sport.length === 0) && <EmptyState message="No sport-specific reports yet." />}
              {summary && summary.by_sport.length > 0 && (
                <Bar
                  data={{
                    labels: summary.by_sport.map((s) => s.sport),
                    datasets: [{ data: summary.by_sport.map((s) => s.count), backgroundColor: MSU_MAROON, borderRadius: 4 }],
                  }}
                  options={{
                    indexAxis: "y",
                    plugins: { legend: { display: false } },
                    scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
                  }}
                />
              )}
            </Card.Body>
          </Card>
          <Card>
            <Card.Body>
              <Card.Title className="h6">Recent report activity</Card.Title>
              {recentReports.length === 0 && <EmptyState message="No reports yet." />}
              <ul className="ab-leaderboard">
                {recentReports.map((r) => (
                  <li key={r.id}>
                    <span className="ab-leaderboard-avatar">
                      <FileText size={15} />
                    </span>
                    <div className="ab-leaderboard-info">
                      <div className="ab-leaderboard-name mb-0">{r.name}</div>
                      <div className="text-muted small">Generated by {r.generated_by_name}</div>
                    </div>
                    <span className="text-muted small flex-shrink-0">{r.generated_on}</span>
                  </li>
                ))}
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={show} onHide={() => setShow(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">Generate report</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreate}>
          <Modal.Body>
            <ErrorAlert message={formError} />
            <Form.Group className="mb-3">
              <Form.Label>Report name</Form.Label>
              <Form.Control value={name} onChange={(e) => setName(e.target.value)} placeholder="Weekly Attendance Summary" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Sport</Form.Label>
              <Form.Control value={newSport} onChange={(e) => setNewSport(e.target.value)} placeholder="All sports" />
            </Form.Group>
            <Form.Group>
              <Form.Label>Range</Form.Label>
              <Form.Select value={range} onChange={(e) => setRange(e.target.value)}>
                <optgroup label="Presets">
                  {REPORT_RANGES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </optgroup>
                {seasons?.length > 0 && (
                  <optgroup label="Seasons">
                    {seasons.map((s) => (
                      <option key={s.id} value={`season:${s.id}`}>
                        {s.name} ({s.start_date} – {s.end_date}){s.is_active ? " · Active" : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
              </Form.Select>
              <div className="text-muted small mt-1">Attendance, evaluations, and sessions are computed only within this range.</div>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShow(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Generating…" : "Generate"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={!!viewing} onHide={() => setViewing(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">{viewing?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-muted small mb-3">
            {viewing?.sport} · {viewing?.range} · Generated {viewing?.generated_on}
          </div>
          <div>{viewing?.details}</div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" size="sm" onClick={() => setViewing(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
