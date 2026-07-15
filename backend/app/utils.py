from sqlalchemy.orm import Session

from . import models


def attendance_pct(db: Session, player_id: int) -> int:
    records = db.query(models.AttendanceRecord).filter(models.AttendanceRecord.player_id == player_id).all()
    if not records:
        return 0
    present_or_late = sum(1 for r in records if r.status in ("present", "late"))
    return round(present_or_late / len(records) * 100)


def last_eval_date(db: Session, player_id: int) -> str:
    latest = (
        db.query(models.Evaluation)
        .filter(models.Evaluation.player_id == player_id)
        .order_by(models.Evaluation.id.desc())
        .first()
    )
    return latest.date if latest else "—"


def eval_average(evaluation: models.Evaluation) -> float:
    return round((evaluation.skill + evaluation.effort + evaluation.teamwork + evaluation.attitude) / 4, 1)
