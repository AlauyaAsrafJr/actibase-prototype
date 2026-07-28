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
