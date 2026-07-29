from sqlalchemy.orm import Session

from . import models


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


def report_summary(db: Session, sport: str | None = None) -> str:
    """Real, computed report body — pulled from live attendance/evaluation/
    training data, scoped to a sport when one is given."""
    players_q = db.query(models.Player)
    if sport and sport != "All sports":
        players_q = players_q.join(models.Coach, models.Coach.coach_id == models.Player.coach_id).filter(models.Coach.specialization == sport)
    players = players_q.all()
    if not players:
        return "No players in scope for this report."
    player_ids = [p.player_id for p in players]

    avg_attendance = round(sum(attendance_pct(db, pid) for pid in player_ids) / len(player_ids), 1)

    feedback_rows = db.query(models.PerformanceFeedback).filter(models.PerformanceFeedback.player_id.in_(player_ids)).all()
    avg_rating = round(sum(f.rating for f in feedback_rows) / len(feedback_rows), 1) if feedback_rows else None

    activities_q = db.query(models.TrainingActivity).filter(models.TrainingActivity.status == "Completed")
    if sport and sport != "All sports":
        activities_q = activities_q.join(models.Coach, models.Coach.coach_id == models.TrainingActivity.coach_id).filter(models.Coach.specialization == sport)
    completed_sessions = activities_q.count()

    parts = [f"{len(players)} player(s) in scope", f"{avg_attendance}% average attendance"]
    if avg_rating is not None:
        parts.append(f"{avg_rating}/5 average evaluation rating")
    parts.append(f"{completed_sessions} completed training session(s)")
    return " • ".join(parts)
