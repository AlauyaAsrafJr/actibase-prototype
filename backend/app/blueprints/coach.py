from flask import Blueprint, g, request

from .. import models, schemas
from ..auth import require_role
from ..config import TODAY_LABEL
from ..database import get_db
from ..errors import ApiError
from ..http import dump, dump_list, json_response, parse_body
from ..utils import attendance_pct, eval_average, last_eval_date

coach_bp = Blueprint("coach", __name__, url_prefix="/coach")
coach_bp.before_request(require_role("coach"))


def _current_coach() -> models.User:
    return g.current_user


# ---- dashboard ----


@coach_bp.get("/dashboard")
def dashboard():
    db = get_db()
    coach = _current_coach()
    roster = db.query(models.User).filter(models.User.coach_id == coach.id, models.User.role == "player").all()
    sessions = db.query(models.TrainingSession).filter(models.TrainingSession.coach_id == coach.id).all()
    completed = [s for s in sessions if s.status == "Completed" and s.rate is not None]
    avg_rate = round(sum(s.rate for s in completed) / len(completed)) if completed else 0
    evaluated_player_ids = {
        e.player_id for e in db.query(models.Evaluation).filter(models.Evaluation.coach_id == coach.id).all()
    }
    out = schemas.CoachDashboardOut(
        player_count=len(roster),
        todays_sessions=sum(1 for s in sessions if s.date == TODAY_LABEL),
        attendance_rate=avg_rate,
        pending_evaluations=sum(1 for p in roster if p.id not in evaluated_player_ids),
        upcoming_training=sum(1 for s in sessions if s.status == "Scheduled"),
        recent_feedback=db.query(models.Evaluation).filter(models.Evaluation.coach_id == coach.id).count(),
    )
    return json_response(out)


# ---- roster ----


@coach_bp.get("/roster")
def roster():
    db = get_db()
    coach = _current_coach()
    players = db.query(models.User).filter(models.User.coach_id == coach.id, models.User.role == "player").order_by(models.User.name).all()
    out = [
        schemas.RosterPlayerOut(
            id=p.id, name=p.name, year=p.year, position=p.position,
            attendance_pct=attendance_pct(db, p.id), last_eval=last_eval_date(db, p.id),
        )
        for p in players
    ]
    return json_response([o.model_dump() for o in out])


# ---- sessions ----


def _session_out(db, s: models.TrainingSession) -> schemas.SessionOut:
    names = [
        a.name
        for a in db.query(models.Activity)
        .join(models.ActivityAssignment, models.ActivityAssignment.activity_id == models.Activity.id)
        .filter(models.ActivityAssignment.session_id == s.id)
        .all()
    ]
    out = schemas.SessionOut.model_validate(s)
    out.activity_names = names
    return out


@coach_bp.get("/sessions")
def list_sessions():
    db = get_db()
    coach = _current_coach()
    sessions = db.query(models.TrainingSession).filter(models.TrainingSession.coach_id == coach.id).order_by(models.TrainingSession.id.desc()).all()
    return json_response([_session_out(db, s).model_dump() for s in sessions])


@coach_bp.post("/sessions")
def create_session():
    payload = parse_body(schemas.SessionCreate)
    if not payload.date.strip():
        raise ApiError("date is required", 400)
    db = get_db()
    coach = _current_coach()
    session = models.TrainingSession(
        coach_id=coach.id, date=payload.date, time=payload.time, type=payload.type,
        location=payload.location, sport=coach.sport, status="Scheduled",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return json_response(_session_out(db, session).model_dump(), 201)


# ---- activities ----


@coach_bp.get("/activities")
def list_activities():
    db = get_db()
    coach = _current_coach()
    category = request.args.get("category")
    q = db.query(models.Activity).filter(models.Activity.coach_id == coach.id)
    if category and category != "all":
        q = q.filter(models.Activity.category == category)
    activities = q.order_by(models.Activity.id.desc()).all()
    out = []
    for a in activities:
        session_ids = [
            row.session_id
            for row in db.query(models.ActivityAssignment).filter(models.ActivityAssignment.activity_id == a.id).all()
        ]
        item = schemas.ActivityOut.model_validate(a)
        item.assigned_session_ids = session_ids
        out.append(item.model_dump())
    return json_response(out)


@coach_bp.post("/activities")
def create_activity():
    payload = parse_body(schemas.ActivityCreate)
    if not payload.name.strip():
        raise ApiError("name is required", 400)
    db = get_db()
    coach = _current_coach()
    activity = models.Activity(
        coach_id=coach.id, name=payload.name, category=payload.category,
        duration=payload.duration, difficulty=payload.difficulty, description=payload.description,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    out = schemas.ActivityOut.model_validate(activity)
    out.assigned_session_ids = []
    return json_response(out.model_dump(), 201)


@coach_bp.post("/activities/<int:activity_id>/assign")
def assign_activity(activity_id: int):
    payload = parse_body(schemas.AssignActivityRequest)
    db = get_db()
    coach = _current_coach()
    activity = db.get(models.Activity, activity_id)
    if activity is None or activity.coach_id != coach.id:
        raise ApiError("Activity not found", 404)
    session = db.get(models.TrainingSession, payload.session_id)
    if session is None or session.coach_id != coach.id:
        raise ApiError("Session not found", 404)
    exists = (
        db.query(models.ActivityAssignment)
        .filter(models.ActivityAssignment.activity_id == activity_id, models.ActivityAssignment.session_id == payload.session_id)
        .first()
    )
    if not exists:
        db.add(models.ActivityAssignment(activity_id=activity_id, session_id=payload.session_id))
        db.commit()
    return json_response({"assigned": True})


# ---- attendance ----


@coach_bp.get("/attendance/<int:session_id>")
def get_attendance(session_id: int):
    db = get_db()
    coach = _current_coach()
    session = db.get(models.TrainingSession, session_id)
    if session is None or session.coach_id != coach.id:
        raise ApiError("Session not found", 404)
    players = db.query(models.User).filter(models.User.coach_id == coach.id, models.User.role == "player").order_by(models.User.name).all()
    marks = {
        r.player_id: r.status
        for r in db.query(models.AttendanceRecord).filter(models.AttendanceRecord.session_id == session_id).all()
    }
    return json_response([
        {"player_id": p.id, "name": p.name, "position": p.position, "status": marks.get(p.id, "present")}
        for p in players
    ])


@coach_bp.post("/attendance/<int:session_id>/mark")
def mark_attendance(session_id: int):
    payload = parse_body(schemas.AttendanceMarkRequest)
    db = get_db()
    coach = _current_coach()
    session = db.get(models.TrainingSession, session_id)
    if session is None or session.coach_id != coach.id:
        raise ApiError("Session not found", 404)
    if payload.status not in ("present", "late", "absent"):
        raise ApiError("status must be present, late, or absent", 400)
    record = (
        db.query(models.AttendanceRecord)
        .filter(models.AttendanceRecord.session_id == session_id, models.AttendanceRecord.player_id == payload.player_id)
        .first()
    )
    if record:
        record.status = payload.status
    else:
        db.add(models.AttendanceRecord(session_id=session_id, player_id=payload.player_id, status=payload.status))
    db.commit()
    return json_response({"ok": True})


@coach_bp.post("/attendance/<int:session_id>/mark-all-present")
def mark_all_present(session_id: int):
    db = get_db()
    coach = _current_coach()
    session = db.get(models.TrainingSession, session_id)
    if session is None or session.coach_id != coach.id:
        raise ApiError("Session not found", 404)
    db.query(models.AttendanceRecord).filter(models.AttendanceRecord.session_id == session_id).delete()
    db.commit()
    return json_response({"ok": True})


@coach_bp.post("/attendance/<int:session_id>/save")
def save_attendance(session_id: int):
    db = get_db()
    coach = _current_coach()
    session = db.get(models.TrainingSession, session_id)
    if session is None or session.coach_id != coach.id:
        raise ApiError("Session not found", 404)
    players = db.query(models.User).filter(models.User.coach_id == coach.id, models.User.role == "player").all()
    marks = {
        r.player_id: r.status
        for r in db.query(models.AttendanceRecord).filter(models.AttendanceRecord.session_id == session_id).all()
    }
    statuses = [marks.get(p.id, "present") for p in players]
    present = sum(1 for s in statuses if s in ("present", "late"))
    total = len(statuses)
    session.status = "Completed"
    session.present = present
    session.absent = total - present
    session.total = total
    session.rate = round(present / total * 100) if total else 0
    db.commit()
    db.refresh(session)
    return json_response(_session_out(db, session).model_dump())


# ---- evaluations ----


@coach_bp.get("/evaluations")
def list_evaluations():
    db = get_db()
    coach = _current_coach()
    evals = db.query(models.Evaluation).filter(models.Evaluation.coach_id == coach.id).order_by(models.Evaluation.id.desc()).all()
    out = []
    for e in evals:
        player = db.get(models.User, e.player_id)
        item = schemas.EvaluationOut(
            id=e.id, player_id=e.player_id, player_name=player.name if player else "Unknown",
            date=e.date, skill=e.skill, effort=e.effort, teamwork=e.teamwork,
            attitude=e.attitude, comment=e.comment,
        )
        out.append(item.model_dump())
    return json_response(out)


@coach_bp.post("/evaluations")
def create_evaluation():
    payload = parse_body(schemas.EvaluationCreate)
    db = get_db()
    coach = _current_coach()
    player = db.get(models.User, payload.player_id)
    if player is None or player.coach_id != coach.id:
        raise ApiError("Player not found on your roster", 404)
    evaluation = models.Evaluation(
        player_id=payload.player_id, coach_id=coach.id, date=TODAY_LABEL,
        skill=payload.skill, effort=payload.effort, teamwork=payload.teamwork,
        attitude=payload.attitude, comment=payload.comment,
    )
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)
    out = schemas.EvaluationOut(
        id=evaluation.id, player_id=evaluation.player_id, player_name=player.name,
        date=evaluation.date, skill=evaluation.skill, effort=evaluation.effort,
        teamwork=evaluation.teamwork, attitude=evaluation.attitude, comment=evaluation.comment,
    )
    return json_response(out.model_dump(), 201)


# ---- reports ----


@coach_bp.get("/reports")
def list_reports():
    db = get_db()
    coach = _current_coach()
    reports = db.query(models.Report).filter(models.Report.owner_role == "coach", models.Report.coach_id == coach.id).order_by(models.Report.id.desc()).all()
    return json_response(dump_list(schemas.ReportOut, reports))


@coach_bp.post("/reports")
def generate_report():
    payload = parse_body(schemas.ReportCreate)
    db = get_db()
    coach = _current_coach()
    report = models.Report(
        owner_role="coach", coach_id=coach.id, name=payload.name or "Untitled report",
        sport=coach.sport, range="Custom", generated_on="Just now", status="Ready",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return json_response(dump(schemas.ReportOut, report), 201)


# ---- profile ----


@coach_bp.get("/profile")
def get_profile():
    return json_response(dump(schemas.UserOut, _current_coach()))


@coach_bp.patch("/profile")
def update_profile():
    payload = parse_body(schemas.ProfileUpdate)
    db = get_db()
    coach = _current_coach()
    for field in ("name", "sport", "email", "phone", "bio", "years_coaching"):
        value = getattr(payload, field)
        if value is not None:
            setattr(coach, field, value)
    db.commit()
    db.refresh(coach)
    return json_response(dump(schemas.UserOut, coach))
