from flask import Blueprint, g

from .. import models, schemas
from ..auth import require_role
from ..config import TODAY_LABEL
from ..database import get_db
from ..errors import ApiError
from ..http import json_response, parse_body
from ..serializers import full_name, user_out
from ..utils import attendance_pct, last_eval_date, report_summary

coach_bp = Blueprint("coach", __name__, url_prefix="/coach")
coach_bp.before_request(require_role("coach"))


def _current_coach(db) -> models.Coach:
    return db.query(models.Coach).filter(models.Coach.user_id == g.current_user.user_id).first()


def _roster(db, coach: models.Coach) -> list[models.Player]:
    return db.query(models.Player).filter(models.Player.coach_id == coach.coach_id).order_by(models.Player.first_name).all()


# ---- dashboard ----


@coach_bp.get("/dashboard")
def dashboard():
    db = get_db()
    coach = _current_coach(db)
    roster = _roster(db, coach)
    activities = db.query(models.TrainingActivity).filter(models.TrainingActivity.coach_id == coach.coach_id).all()

    completed_dates = [a.activity_date for a in activities if a.status == "Completed"]
    rates = []
    for date in completed_dates:
        marks = db.query(models.Attendance).filter(models.Attendance.coach_id == coach.coach_id, models.Attendance.date == date).all()
        if roster:
            present = sum(1 for m in marks if m.status in ("present", "late"))
            rates.append(round(present / len(roster) * 100))
    avg_rate = round(sum(rates) / len(rates)) if rates else 0

    evaluated_player_ids = {
        f.player_id for f in db.query(models.PerformanceFeedback).filter(models.PerformanceFeedback.coach_id == coach.coach_id).all()
    }
    out = schemas.CoachDashboardOut(
        player_count=len(roster),
        todays_sessions=sum(1 for a in activities if a.activity_date == TODAY_LABEL),
        attendance_rate=avg_rate,
        pending_evaluations=sum(1 for p in roster if p.player_id not in evaluated_player_ids),
        upcoming_training=sum(1 for a in activities if a.status == "Scheduled"),
        recent_feedback=db.query(models.PerformanceFeedback).filter(models.PerformanceFeedback.coach_id == coach.coach_id).count(),
    )
    return json_response(out)


# ---- roster ----


@coach_bp.get("/roster")
def roster():
    db = get_db()
    coach = _current_coach(db)
    players = _roster(db, coach)
    out = [
        schemas.RosterPlayerOut(
            id=p.player_id, name=full_name(p.first_name, p.last_name, p.middle_name), year=p.year, position=p.position,
            attendance_pct=attendance_pct(db, p.player_id), last_eval=last_eval_date(db, p.player_id),
        )
        for p in players
    ]
    return json_response([o.model_dump() for o in out])


# ---- training activities (sessions) ----


def _activity_out(db, a: models.TrainingActivity, roster: list[models.Player]) -> schemas.SessionOut:
    marks = {
        m.player_id: m.status
        for m in db.query(models.Attendance).filter(models.Attendance.coach_id == a.coach_id, models.Attendance.date == a.activity_date).all()
    }
    # Missing entries default to "present" — matches mark-all-present, which
    # clears explicit rows rather than writing one per player.
    statuses = [marks.get(p.player_id, "present") for p in roster]
    present = sum(1 for s in statuses if s in ("present", "late"))
    roster_size = len(roster)
    finalized = a.status == "Completed"
    coach = db.get(models.Coach, a.coach_id)
    return schemas.SessionOut(
        id=a.activity_id, date=a.activity_date, time=a.time or "", type=a.activity_name,
        location=a.location or "", sport=coach.specialization if coach else None, status=a.status,
        present=present if finalized else None,
        absent=(roster_size - present) if finalized else None,
        total=roster_size if finalized else None,
        rate=(round(present / roster_size * 100) if roster_size else 0) if finalized else None,
    )


@coach_bp.get("/sessions")
def list_sessions():
    db = get_db()
    coach = _current_coach(db)
    roster = _roster(db, coach)
    activities = db.query(models.TrainingActivity).filter(models.TrainingActivity.coach_id == coach.coach_id).order_by(models.TrainingActivity.activity_id.desc()).all()
    return json_response([_activity_out(db, a, roster).model_dump() for a in activities])


@coach_bp.post("/sessions")
def create_session():
    payload = parse_body(schemas.SessionCreate)
    if not payload.date.strip():
        raise ApiError("date is required", 400)
    db = get_db()
    coach = _current_coach(db)
    activity = models.TrainingActivity(
        coach_id=coach.coach_id, activity_name=payload.type, activity_date=payload.date,
        time=payload.time, location=payload.location, status="Scheduled",
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return json_response(_activity_out(db, activity, _roster(db, coach)).model_dump(), 201)


# ---- attendance ----


@coach_bp.get("/attendance/<int:session_id>")
def get_attendance(session_id: int):
    db = get_db()
    coach = _current_coach(db)
    activity = db.get(models.TrainingActivity, session_id)
    if activity is None or activity.coach_id != coach.coach_id:
        raise ApiError("Session not found", 404)
    players = _roster(db, coach)
    marks = {
        m.player_id: m.status
        for m in db.query(models.Attendance).filter(models.Attendance.coach_id == coach.coach_id, models.Attendance.date == activity.activity_date).all()
    }
    return json_response([
        {"player_id": p.player_id, "name": full_name(p.first_name, p.last_name, p.middle_name), "position": p.position, "status": marks.get(p.player_id, "present")}
        for p in players
    ])


@coach_bp.post("/attendance/<int:session_id>/mark")
def mark_attendance(session_id: int):
    payload = parse_body(schemas.AttendanceMarkRequest)
    db = get_db()
    coach = _current_coach(db)
    activity = db.get(models.TrainingActivity, session_id)
    if activity is None or activity.coach_id != coach.coach_id:
        raise ApiError("Session not found", 404)
    if payload.status not in ("present", "late", "absent"):
        raise ApiError("status must be present, late, or absent", 400)
    record = (
        db.query(models.Attendance)
        .filter(models.Attendance.coach_id == coach.coach_id, models.Attendance.date == activity.activity_date, models.Attendance.player_id == payload.player_id)
        .first()
    )
    if record:
        record.status = payload.status
    else:
        db.add(models.Attendance(player_id=payload.player_id, coach_id=coach.coach_id, date=activity.activity_date, status=payload.status))
    db.commit()
    return json_response({"ok": True})


@coach_bp.post("/attendance/<int:session_id>/mark-all-present")
def mark_all_present(session_id: int):
    db = get_db()
    coach = _current_coach(db)
    activity = db.get(models.TrainingActivity, session_id)
    if activity is None or activity.coach_id != coach.coach_id:
        raise ApiError("Session not found", 404)
    db.query(models.Attendance).filter(models.Attendance.coach_id == coach.coach_id, models.Attendance.date == activity.activity_date).delete()
    db.commit()
    return json_response({"ok": True})


@coach_bp.post("/attendance/<int:session_id>/save")
def save_attendance(session_id: int):
    db = get_db()
    coach = _current_coach(db)
    activity = db.get(models.TrainingActivity, session_id)
    if activity is None or activity.coach_id != coach.coach_id:
        raise ApiError("Session not found", 404)
    activity.status = "Completed"

    # Record real Participation rows for whoever showed up — this is the
    # ERD's player<->activity join, populated at the point attendance is
    # finalized for this training activity.
    marks = {
        m.player_id: m.status
        for m in db.query(models.Attendance).filter(models.Attendance.coach_id == coach.coach_id, models.Attendance.date == activity.activity_date).all()
    }
    for player in _roster(db, coach):
        status = marks.get(player.player_id, "present")
        participation_status = "Completed" if status in ("present", "late") else "Absent"
        row = (
            db.query(models.Participation)
            .filter(models.Participation.player_id == player.player_id, models.Participation.activity_id == activity.activity_id)
            .first()
        )
        if row:
            row.participation_status = participation_status
        else:
            db.add(models.Participation(player_id=player.player_id, activity_id=activity.activity_id, participation_status=participation_status))

    db.commit()
    db.refresh(activity)
    return json_response(_activity_out(db, activity, _roster(db, coach)).model_dump())


# ---- evaluations (performance feedback) ----


@coach_bp.get("/evaluations")
def list_evaluations():
    db = get_db()
    coach = _current_coach(db)
    feedback_rows = db.query(models.PerformanceFeedback).filter(models.PerformanceFeedback.coach_id == coach.coach_id).order_by(models.PerformanceFeedback.feedback_id.desc()).all()
    out = []
    for f in feedback_rows:
        player = db.get(models.Player, f.player_id)
        out.append(schemas.EvaluationOut(
            id=f.feedback_id, player_id=f.player_id, player_name=full_name(player.first_name, player.last_name, player.middle_name) if player else "Unknown",
            date=f.feedback_date, skill=f.skill, effort=f.effort, teamwork=f.teamwork, attitude=f.attitude, comment=f.comments,
        ).model_dump())
    return json_response(out)


@coach_bp.post("/evaluations")
def create_evaluation():
    payload = parse_body(schemas.EvaluationCreate)
    db = get_db()
    coach = _current_coach(db)
    player = db.get(models.Player, payload.player_id)
    if player is None or player.coach_id != coach.coach_id:
        raise ApiError("Player not found on your roster", 404)
    overall = round((payload.skill + payload.effort + payload.teamwork + payload.attitude) / 4)
    feedback = models.PerformanceFeedback(
        player_id=payload.player_id, coach_id=coach.coach_id, feedback_date=TODAY_LABEL,
        skill=payload.skill, effort=payload.effort, teamwork=payload.teamwork, attitude=payload.attitude,
        rating=overall, comments=payload.comment,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    out = schemas.EvaluationOut(
        id=feedback.feedback_id, player_id=feedback.player_id, player_name=full_name(player.first_name, player.last_name, player.middle_name),
        date=feedback.feedback_date, skill=feedback.skill, effort=feedback.effort,
        teamwork=feedback.teamwork, attitude=feedback.attitude, comment=feedback.comments,
    )
    return json_response(out.model_dump(), 201)


# ---- reports ----


@coach_bp.get("/reports")
def list_reports():
    db = get_db()
    reports = db.query(models.ReportAnalytics).filter(models.ReportAnalytics.generated_by == g.current_user.user_id).order_by(models.ReportAnalytics.report_id.desc()).all()
    out = [
        schemas.ReportOut(id=r.report_id, name=r.title, sport=r.sport, range=r.range, generated_on=r.generated_date, status=r.status, details=r.details)
        for r in reports
    ]
    return json_response([o.model_dump() for o in out])


@coach_bp.post("/reports")
def generate_report():
    payload = parse_body(schemas.ReportCreate)
    db = get_db()
    coach = _current_coach(db)
    report = models.ReportAnalytics(
        report_type="Training", generated_by=g.current_user.user_id, generated_date="Just now",
        title=payload.name or "Untitled report", sport=coach.specialization, range="Custom", status="Ready",
        details=report_summary(db, coach.specialization),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    out = schemas.ReportOut(id=report.report_id, name=report.title, sport=report.sport, range=report.range, generated_on=report.generated_date, status=report.status, details=report.details)
    return json_response(out.model_dump(), 201)


# ---- profile ----


@coach_bp.get("/profile")
def get_profile():
    db = get_db()
    coach = _current_coach(db)
    return json_response(user_out(g.current_user, coach))


@coach_bp.patch("/profile")
def update_profile():
    payload = parse_body(schemas.ProfileUpdate)
    db = get_db()
    su = g.current_user
    coach = _current_coach(db)
    if payload.name is not None:
        first, last = (payload.name.strip().split(" ", 1) + [""])[:2]
        coach.first_name, coach.last_name = first, last
    if payload.sport is not None:
        coach.specialization = payload.sport
    if payload.email is not None:
        coach.email = payload.email
        su.username = payload.email
    if payload.phone is not None:
        coach.contact_number = payload.phone
    if payload.bio is not None:
        coach.bio = payload.bio
    if payload.years_coaching is not None:
        coach.years_coaching = payload.years_coaching
    db.commit()
    db.refresh(coach)
    return json_response(user_out(su, coach))
