from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from . import models
from .config import TODAY_LABEL

DATE_FORMAT = "%b %d, %Y"  # matches every stored date string, e.g. "Jul 20, 2026"

REPORT_RANGES = ("Last 7 days", "Last 30 days", "All time")


def _parse_date(value: str) -> date | None:
    try:
        return datetime.strptime(value, DATE_FORMAT).date()
    except (ValueError, TypeError):
        return None


# Public alias — season validation (admin.py) needs the same parser.
parse_date = _parse_date


def _range_window(range_label: str) -> tuple[date, date] | None:
    """None means unbounded (All time or an unrecognized label)."""
    today = _parse_date(TODAY_LABEL)
    if range_label == "Last 7 days":
        return today - timedelta(days=6), today
    if range_label == "Last 30 days":
        return today - timedelta(days=29), today
    return None


def season_window(season: "models.Season") -> tuple[date, date] | None:
    start = _parse_date(season.start_date)
    end = _parse_date(season.end_date)
    if start is None or end is None:
        return None
    return (start, end)


def attendance_pct(db: Session, player_id: int) -> int:
    records = db.query(models.Attendance).filter(models.Attendance.player_id == player_id).all()
    if not records:
        return 0
    present_or_late = sum(1 for r in records if r.status in ("present", "late"))
    return round(present_or_late / len(records) * 100)


def last_eval_date(db: Session, player_id: int) -> str:
    latest = (
        db.query(models.PerformanceFeedback)
        .filter(models.PerformanceFeedback.player_id == player_id)
        .order_by(models.PerformanceFeedback.feedback_id.desc())
        .first()
    )
    return latest.feedback_date if latest else "—"


def eval_average(feedback: models.PerformanceFeedback) -> float:
    return round((feedback.skill + feedback.effort + feedback.teamwork + feedback.attitude) / 4, 1)


def _attendance_pct_in_window(db: Session, player_id: int, window: tuple[date, date] | None) -> int | None:
    """None means no attendance rows fall in the window — distinct from a
    real 0%, so a quiet week doesn't fabricate a bad attendance number."""
    records = db.query(models.Attendance).filter(models.Attendance.player_id == player_id).all()
    if window is not None:
        records = [r for r in records if (d := _parse_date(r.date)) and window[0] <= d <= window[1]]
    if not records:
        return None
    present_or_late = sum(1 for r in records if r.status in ("present", "late"))
    return round(present_or_late / len(records) * 100)


def report_summary(
    db: Session,
    sport: str | None = None,
    range_label: str = "All time",
    window: tuple[date, date] | None = None,
) -> str:
    """Real, computed report body — pulled from live attendance/evaluation/
    training data, scoped to a sport and a date range when given. Dates are
    stored as strings ("Jul 20, 2026"), so the range is applied in Python
    against the parsed value, not in SQL.

    Pass `window` directly (e.g. a season's date range) to bypass the
    range_label presets entirely; window=None with an unrecognized/"All
    time" range_label means unbounded.
    """
    players_q = db.query(models.Player)
    if sport and sport != "All sports":
        players_q = players_q.join(models.Coach, models.Coach.coach_id == models.Player.coach_id).filter(models.Coach.specialization == sport)
    players = players_q.all()
    if not players:
        return "No players in scope for this report."
    player_ids = [p.player_id for p in players]
    if window is None:
        window = _range_window(range_label)

    pct_values = [v for v in (_attendance_pct_in_window(db, pid, window) for pid in player_ids) if v is not None]
    avg_attendance = round(sum(pct_values) / len(pct_values), 1) if pct_values else None

    feedback_rows = db.query(models.PerformanceFeedback).filter(models.PerformanceFeedback.player_id.in_(player_ids)).all()
    if window is not None:
        feedback_rows = [f for f in feedback_rows if (d := _parse_date(f.feedback_date)) and window[0] <= d <= window[1]]
    avg_rating = round(sum(f.rating for f in feedback_rows) / len(feedback_rows), 1) if feedback_rows else None

    activities_q = db.query(models.TrainingActivity).filter(models.TrainingActivity.status == "Completed")
    if sport and sport != "All sports":
        activities_q = activities_q.join(models.Coach, models.Coach.coach_id == models.TrainingActivity.coach_id).filter(models.Coach.specialization == sport)
    activities = activities_q.all()
    if window is not None:
        activities = [a for a in activities if (d := _parse_date(a.activity_date)) and window[0] <= d <= window[1]]
    completed_sessions = len(activities)

    parts = [f"{len(players)} player(s) in scope"]
    parts.append(f"{avg_attendance}% average attendance" if avg_attendance is not None else "no attendance data in range")
    if avg_rating is not None:
        parts.append(f"{avg_rating}/5 average evaluation rating")
    parts.append(f"{completed_sessions} completed training session(s)")
    return " • ".join(parts)
