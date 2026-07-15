from flask import Blueprint, g

from .. import models, schemas
from ..auth import require_role
from ..database import get_db
from ..http import dump, json_response, parse_body
from ..utils import attendance_pct, eval_average

player_bp = Blueprint("player", __name__, url_prefix="/player")
player_bp.before_request(require_role("player"))

STATUS_DISPLAY = {"present": "Present", "late": "Late", "absent": "Absent"}


def _current_player() -> models.User:
    return g.current_user


def _coach_sessions(db, player: models.User) -> list[models.TrainingSession]:
    if player.coach_id is None:
        return []
    return db.query(models.TrainingSession).filter(models.TrainingSession.coach_id == player.coach_id).order_by(models.TrainingSession.id.desc()).all()


def _attendance_rows(db, player: models.User) -> list[schemas.PlayerAttendanceOut]:
    sessions = _coach_sessions(db, player)
    marks = {
        r.session_id: r.status
        for r in db.query(models.AttendanceRecord).filter(models.AttendanceRecord.player_id == player.id).all()
    }
    rows = []
    for s in sessions:
        if s.status == "Scheduled":
            display_status = "Upcoming"
        else:
            display_status = STATUS_DISPLAY.get(marks.get(s.id), "Absent")
        rows.append(schemas.PlayerAttendanceOut(id=s.id, date=s.date, type=s.type, location=s.location, status=display_status))
    return rows


def _teammates(db, player: models.User) -> list[tuple[models.User, int]]:
    if player.coach_id is None:
        teammates = [player]
    else:
        teammates = db.query(models.User).filter(models.User.coach_id == player.coach_id, models.User.role == "player").all()
    ranked = [(t, attendance_pct(db, t.id)) for t in teammates]
    ranked.sort(key=lambda pair: pair[1], reverse=True)
    return ranked


# ---- dashboard ----


@player_bp.get("/dashboard")
def dashboard():
    db = get_db()
    player = _current_player()
    attendance_rows = _attendance_rows(db, player)
    counted = [r for r in attendance_rows if r.status != "Upcoming"]
    attended = sum(1 for r in counted if r.status in ("Present", "Late"))
    rate = round(attended / len(counted) * 100) if counted else 0

    latest_eval = (
        db.query(models.Evaluation)
        .filter(models.Evaluation.player_id == player.id)
        .order_by(models.Evaluation.id.desc())
        .first()
    )
    activities_completed = (
        db.query(models.ActivityAssignment)
        .join(models.TrainingSession, models.TrainingSession.id == models.ActivityAssignment.session_id)
        .filter(models.TrainingSession.coach_id == player.coach_id)
        .count()
        if player.coach_id
        else 0
    )
    ranked = _teammates(db, player)
    rank = next((i + 1 for i, (t, _) in enumerate(ranked) if t.id == player.id), len(ranked))

    out = schemas.PlayerDashboardOut(
        attendance_rate=rate,
        sessions_attended=attended,
        upcoming_sessions=sum(1 for r in attendance_rows if r.status == "Upcoming"),
        latest_evaluation_avg=eval_average(latest_eval) if latest_eval else None,
        activities_completed=activities_completed,
        overall_rank=rank,
        team_size=len(ranked),
    )
    return json_response(out)


# ---- attendance ----


@player_bp.get("/attendance")
def attendance():
    db = get_db()
    rows = _attendance_rows(db, _current_player())
    return json_response([r.model_dump() for r in rows])


# ---- activities ----


@player_bp.get("/activities")
def activities():
    db = get_db()
    player = _current_player()
    if player.coach_id is None:
        return json_response([])
    rows = (
        db.query(models.Activity, models.TrainingSession)
        .join(models.ActivityAssignment, models.ActivityAssignment.activity_id == models.Activity.id)
        .join(models.TrainingSession, models.TrainingSession.id == models.ActivityAssignment.session_id)
        .filter(models.TrainingSession.coach_id == player.coach_id)
        .order_by(models.TrainingSession.id.desc())
        .all()
    )
    out = [
        schemas.PlayerActivityOut(
            id=a.id, name=a.name, category=a.category, duration=a.duration,
            difficulty=a.difficulty, description=a.description, date=s.date,
        ).model_dump()
        for a, s in rows
    ]
    return json_response(out)


# ---- evaluations ----


@player_bp.get("/evaluations")
def evaluations():
    db = get_db()
    player = _current_player()
    evals = db.query(models.Evaluation).filter(models.Evaluation.player_id == player.id).order_by(models.Evaluation.id.desc()).all()
    out = []
    for e in evals:
        coach = db.get(models.User, e.coach_id)
        out.append(
            schemas.PlayerEvaluationOut(
                id=e.id, date=e.date, coach_name=coach.name if coach else "Unknown",
                skill=e.skill, effort=e.effort, teamwork=e.teamwork, attitude=e.attitude, comment=e.comment,
            ).model_dump()
        )
    return json_response(out)


# ---- stats ----


@player_bp.get("/stats")
def stats():
    db = get_db()
    player = _current_player()
    attendance_rows = _attendance_rows(db, player)
    counted = [r for r in attendance_rows if r.status != "Upcoming"]
    attended = sum(1 for r in counted if r.status in ("Present", "Late"))
    rate = round(attended / len(counted) * 100) if counted else 0

    evals = db.query(models.Evaluation).filter(models.Evaluation.player_id == player.id).all()
    avg_eval = round(sum(eval_average(e) for e in evals) / len(evals), 1) if evals else 0.0

    ranked = _teammates(db, player)
    rank = next((i + 1 for i, (t, _) in enumerate(ranked) if t.id == player.id), len(ranked))

    out = schemas.PlayerStatsOut(
        attendance_rate=rate,
        sessions_attended=attended,
        avg_evaluation=avg_eval,
        team_rank=rank,
        team_size=len(ranked),
        teammates=[schemas.TeammateOut(name=t.name, attendance_pct=pct) for t, pct in ranked],
    )
    return json_response(out)


# ---- profile ----


@player_bp.get("/profile")
def get_profile():
    return json_response(dump(schemas.UserOut, _current_player()))


@player_bp.patch("/profile")
def update_profile():
    payload = parse_body(schemas.ProfileUpdate)
    db = get_db()
    player = _current_player()
    for field in ("name", "sport", "email", "phone", "bio", "position", "year"):
        value = getattr(payload, field)
        if value is not None:
            setattr(player, field, value)
    db.commit()
    db.refresh(player)
    return json_response(dump(schemas.UserOut, player))
