from flask import Blueprint, g

from .. import models, schemas
from ..auth import require_role
from ..database import get_db
from ..http import json_response, parse_body
from ..serializers import full_name, user_out
from ..utils import attendance_pct, eval_average

player_bp = Blueprint("player", __name__, url_prefix="/player")
player_bp.before_request(require_role("player"))

STATUS_DISPLAY = {"present": "Present", "late": "Late", "absent": "Absent"}


def _current_player(db) -> models.Player:
    return db.query(models.Player).filter(models.Player.user_id == g.current_user.user_id).first()


def _coach_activities(db, player: models.Player) -> list[models.TrainingActivity]:
    if player.coach_id is None:
        return []
    return db.query(models.TrainingActivity).filter(models.TrainingActivity.coach_id == player.coach_id).order_by(models.TrainingActivity.activity_id.desc()).all()


def _attendance_rows(db, player: models.Player) -> list[schemas.PlayerAttendanceOut]:
    activities = _coach_activities(db, player)
    marks = {
        m.date: m.status
        for m in db.query(models.Attendance).filter(models.Attendance.player_id == player.player_id).all()
    }
    rows = []
    for a in activities:
        if a.status == "Scheduled":
            display_status = "Upcoming"
        else:
            display_status = STATUS_DISPLAY.get(marks.get(a.activity_date), "Absent")
        rows.append(schemas.PlayerAttendanceOut(id=a.activity_id, date=a.activity_date, type=a.activity_name, location=a.location or "", status=display_status))
    return rows


def _teammates(db, player: models.Player) -> list[tuple[models.Player, int]]:
    if player.coach_id is None:
        teammates = [player]
    else:
        teammates = db.query(models.Player).filter(models.Player.coach_id == player.coach_id).all()
    ranked = [(t, attendance_pct(db, t.player_id)) for t in teammates]
    ranked.sort(key=lambda pair: pair[1], reverse=True)
    return ranked


# ---- dashboard ----


@player_bp.get("/dashboard")
def dashboard():
    db = get_db()
    player = _current_player(db)
    attendance_rows = _attendance_rows(db, player)
    counted = [r for r in attendance_rows if r.status != "Upcoming"]
    attended = sum(1 for r in counted if r.status in ("Present", "Late"))
    rate = round(attended / len(counted) * 100) if counted else 0

    latest_feedback = (
        db.query(models.PerformanceFeedback)
        .filter(models.PerformanceFeedback.player_id == player.player_id)
        .order_by(models.PerformanceFeedback.feedback_id.desc())
        .first()
    )
    activities_completed = db.query(models.Participation).filter(models.Participation.player_id == player.player_id).count()
    ranked = _teammates(db, player)
    rank = next((i + 1 for i, (t, _) in enumerate(ranked) if t.player_id == player.player_id), len(ranked))

    out = schemas.PlayerDashboardOut(
        attendance_rate=rate,
        sessions_attended=attended,
        upcoming_sessions=sum(1 for r in attendance_rows if r.status == "Upcoming"),
        latest_evaluation_avg=eval_average(latest_feedback) if latest_feedback else None,
        activities_completed=activities_completed,
        overall_rank=rank,
        team_size=len(ranked),
    )
    return json_response(out)


# ---- attendance ----


@player_bp.get("/attendance")
def attendance():
    db = get_db()
    rows = _attendance_rows(db, _current_player(db))
    return json_response([r.model_dump() for r in rows])


# ---- activities (participation) ----


@player_bp.get("/activities")
def activities():
    db = get_db()
    player = _current_player(db)
    rows = (
        db.query(models.Participation, models.TrainingActivity)
        .join(models.TrainingActivity, models.TrainingActivity.activity_id == models.Participation.activity_id)
        .filter(models.Participation.player_id == player.player_id)
        .order_by(models.TrainingActivity.activity_id.desc())
        .all()
    )
    out = [
        schemas.PlayerActivityOut(
            id=a.activity_id, name=a.activity_name, date=a.activity_date,
            duration=a.duration, notes=a.notes, participation_status=part.participation_status,
        ).model_dump()
        for part, a in rows
    ]
    return json_response(out)


# ---- evaluations ----


@player_bp.get("/evaluations")
def evaluations():
    db = get_db()
    player = _current_player(db)
    feedback_rows = db.query(models.PerformanceFeedback).filter(models.PerformanceFeedback.player_id == player.player_id).order_by(models.PerformanceFeedback.feedback_id.desc()).all()
    out = []
    for f in feedback_rows:
        coach = db.get(models.Coach, f.coach_id)
        out.append(
            schemas.PlayerEvaluationOut(
                id=f.feedback_id, date=f.feedback_date, coach_name=full_name(coach.first_name, coach.last_name) if coach else "Unknown",
                skill=f.skill, effort=f.effort, teamwork=f.teamwork, attitude=f.attitude, comment=f.comments,
            ).model_dump()
        )
    return json_response(out)


# ---- stats ----


@player_bp.get("/stats")
def stats():
    db = get_db()
    player = _current_player(db)
    attendance_rows = _attendance_rows(db, player)
    counted = [r for r in attendance_rows if r.status != "Upcoming"]
    attended = sum(1 for r in counted if r.status in ("Present", "Late"))
    rate = round(attended / len(counted) * 100) if counted else 0

    feedback_rows = db.query(models.PerformanceFeedback).filter(models.PerformanceFeedback.player_id == player.player_id).all()
    avg_eval = round(sum(eval_average(f) for f in feedback_rows) / len(feedback_rows), 1) if feedback_rows else 0.0

    ranked = _teammates(db, player)
    rank = next((i + 1 for i, (t, _) in enumerate(ranked) if t.player_id == player.player_id), len(ranked))

    out = schemas.PlayerStatsOut(
        attendance_rate=rate,
        sessions_attended=attended,
        avg_evaluation=avg_eval,
        team_rank=rank,
        team_size=len(ranked),
        teammates=[schemas.TeammateOut(name=full_name(t.first_name, t.last_name, t.middle_name), attendance_pct=pct) for t, pct in ranked],
    )
    return json_response(out)


# ---- profile ----


@player_bp.get("/profile")
def get_profile():
    db = get_db()
    player = _current_player(db)
    return json_response(user_out(g.current_user, player))


@player_bp.patch("/profile")
def update_profile():
    payload = parse_body(schemas.ProfileUpdate)
    db = get_db()
    su = g.current_user
    player = _current_player(db)
    if payload.name is not None:
        first, last = (payload.name.strip().split(" ", 1) + [""])[:2]
        player.first_name, player.last_name = first, last
    if payload.email is not None:
        player.email = payload.email
        su.username = payload.email
    if payload.phone is not None:
        player.contact_number = payload.phone
    if payload.bio is not None:
        player.bio = payload.bio
    if payload.position is not None:
        player.position = payload.position
    if payload.year is not None:
        player.year = payload.year
    db.commit()
    db.refresh(player)
    return json_response(user_out(su, player))
