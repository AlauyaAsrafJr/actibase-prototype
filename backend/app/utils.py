from datetime import date, datetime, timedelta, timezone

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from . import models
from .config import TODAY_LABEL

DATE_FORMAT = "%b %d, %Y"  # matches every stored date string, e.g. "Jul 20, 2026"

REPORT_RANGES = ("Last 7 days", "Last 30 days", "All time")


def visible_announcements(db: Session, sport: str | None = None, coach_id: int | None = None):
    """Program-wide admin posts, always; sport-scoped admin posts, when the
    viewer belongs to that sport; a coach's own posts, when the viewer is on
    that coach's roster (or is that coach)."""
    conditions = [and_(models.Announcement.coach_id.is_(None), models.Announcement.sport.is_(None))]
    if sport:
        conditions.append(and_(models.Announcement.coach_id.is_(None), models.Announcement.sport == sport))
    if coach_id:
        conditions.append(models.Announcement.coach_id == coach_id)
    return (
        db.query(models.Announcement)
        .filter(or_(*conditions))
        .order_by(models.Announcement.announcement_id.desc())
        .all()
    )


def _parse_date(value: str) -> date | None:
    try:
        return datetime.strptime(value, DATE_FORMAT).date()
    except (ValueError, TypeError):
        return None


# Public alias — season validation (admin.py) needs the same parser.
parse_date = _parse_date

TODAY = _parse_date(TODAY_LABEL)


def _week_windows() -> tuple[tuple[date, date], tuple[date, date]]:
    """This trailing 7-day window and the one right before it, both anchored
    on the app's fixed "today" (TODAY_LABEL) so trends line up with the rest
    of the seeded timeline rather than the real wall clock."""
    this_week = (TODAY - timedelta(days=6), TODAY)
    prior_week = (TODAY - timedelta(days=13), TODAY - timedelta(days=7))
    return this_week, prior_week


def _count_in_window(date_strings: list[str], window: tuple[date, date]) -> int:
    start, end = window
    return sum(1 for value in date_strings if (parsed := _parse_date(value)) and start <= parsed <= end)


def week_over_week_trend(date_strings: list[str]) -> int:
    """Net change in weekly occurrences for any list of stored date strings
    (session dates, report dates, archive dates, ...) — this week's count
    minus last week's."""
    this_week, prior_week = _week_windows()
    return _count_in_window(date_strings, this_week) - _count_in_window(date_strings, prior_week)


def signup_trend(db: Session, role: str, coach_id: int | None = None) -> int:
    """Net new accounts of a role this week vs last week, from
    SystemUser.created_at. Pass coach_id to scope player signups to one
    coach's own roster."""
    this_week, prior_week = _week_windows()

    def _count(window: tuple[date, date]) -> int:
        start = datetime.combine(window[0], datetime.min.time(), tzinfo=timezone.utc)
        end = datetime.combine(window[1], datetime.max.time(), tzinfo=timezone.utc)
        q = db.query(models.SystemUser).filter(models.SystemUser.role == role, models.SystemUser.created_at.between(start, end))
        if coach_id is not None and role == "player":
            q = q.join(models.Player, models.Player.user_id == models.SystemUser.user_id).filter(models.Player.coach_id == coach_id)
        return q.count()

    return _count(this_week) - _count(prior_week)


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


def weekly_attendance_trend(db: Session, weeks: int = 12, coach_id: int | None = None) -> list[dict]:
    """Average attendance rate per trailing 7-day window, oldest first. A
    week with no attendance rows in range yields value=None — a real gap,
    not a fabricated 0%."""
    q = db.query(models.Attendance)
    if coach_id is not None:
        q = q.filter(models.Attendance.coach_id == coach_id)
    records = q.all()
    points = []
    for i in range(weeks - 1, -1, -1):
        end = TODAY - timedelta(days=7 * i)
        start = end - timedelta(days=6)
        in_window = [r for r in records if (d := _parse_date(r.date)) and start <= d <= end]
        if in_window:
            present = sum(1 for r in in_window if r.status in ("present", "late"))
            value = round(present / len(in_window) * 100)
        else:
            value = None
        points.append({"label": end.strftime("%b %d"), "value": value})
    return points


def _display_name(first: str, last: str) -> str:
    return f"{first} {last}".strip()


_ACCOUNT_PROFILE_MODEL = {"admin": models.Admin, "coach": models.Coach, "player": models.Player}


def _account_display_name(db: Session, su) -> str:
    if su is None:
        return "Unknown"
    model = _ACCOUNT_PROFILE_MODEL.get(su.role, models.Player)
    profile = db.query(model).filter(model.user_id == su.user_id).first()
    return _display_name(profile.first_name, profile.last_name) if profile else "Unknown"


def recent_activity_feed(db: Session, coach_id: int | None = None, limit: int = 8) -> list[dict]:
    """Merge announcements, completed sessions, and evaluations (plus, for
    the program-wide admin view, reports and archive actions) into one feed
    ordered by real event date, newest first. Keeps each row's original
    date string (rather than reformatting via strftime) so display stays
    consistent with the rest of the app's non-zero-padded day style."""
    events: list[tuple[date, str, str, str, str]] = []

    ann_q = db.query(models.Announcement)
    if coach_id is not None:
        ann_q = ann_q.filter(models.Announcement.coach_id == coach_id)
    for a in ann_q.all():
        d = _parse_date(a.posted_date)
        if d:
            events.append((d, _account_display_name(db, db.get(models.SystemUser, a.author_id)), "Posted announcement", a.title, a.posted_date))

    act_q = db.query(models.TrainingActivity).filter(models.TrainingActivity.status == "Completed")
    if coach_id is not None:
        act_q = act_q.filter(models.TrainingActivity.coach_id == coach_id)
    for act in act_q.all():
        coach = db.get(models.Coach, act.coach_id)
        d = _parse_date(act.activity_date)
        if d:
            events.append((d, _display_name(coach.first_name, coach.last_name) if coach else "Unknown", "Completed session", act.activity_name, act.activity_date))

    fb_q = db.query(models.PerformanceFeedback)
    if coach_id is not None:
        fb_q = fb_q.filter(models.PerformanceFeedback.coach_id == coach_id)
    for f in fb_q.all():
        coach = db.get(models.Coach, f.coach_id)
        player = db.get(models.Player, f.player_id)
        d = _parse_date(f.feedback_date)
        if d:
            detail = _display_name(player.first_name, player.last_name) if player else "a player"
            events.append((d, _display_name(coach.first_name, coach.last_name) if coach else "Unknown", "Submitted evaluation", detail, f.feedback_date))

    if coach_id is None:
        for r in db.query(models.ReportAnalytics).all():
            d = _parse_date(r.generated_date)
            if d:
                events.append((d, _account_display_name(db, db.get(models.SystemUser, r.generated_by)), "Generated report", r.title, r.generated_date))
        for ar in db.query(models.ArchivedRecord).all():
            d = _parse_date(ar.archived_at)
            if d:
                actor_su = db.get(models.SystemUser, ar.archived_by) if ar.archived_by else None
                events.append((d, _account_display_name(db, actor_su) if actor_su else "System", "Archived record", ar.archive_data, ar.archived_at))

    events.sort(key=lambda e: e[0], reverse=True)
    return [{"actor": actor, "action": action, "detail": detail, "when": when} for _d, actor, action, detail, when in events[:limit]]


def top_players_leaderboard(db: Session, coach_id: int | None = None, limit: int = 5) -> list[dict]:
    """Players ranked by average evaluation rating, highest first. Only
    players with at least one evaluation are eligible — no score is ever
    invented for an unevaluated player."""
    players_q = db.query(models.Player)
    if coach_id is not None:
        players_q = players_q.filter(models.Player.coach_id == coach_id)
    rows = []
    for player in players_q.all():
        feedback = db.query(models.PerformanceFeedback).filter(models.PerformanceFeedback.player_id == player.player_id).all()
        if not feedback:
            continue
        avg = sum(eval_average(f) for f in feedback) / len(feedback)
        rows.append({
            "player_id": player.player_id,
            "name": _display_name(player.first_name, player.last_name),
            "position": player.position,
            "avg_rating": round(avg, 1),
        })
    rows.sort(key=lambda r: r["avg_rating"], reverse=True)
    return rows[:limit]
