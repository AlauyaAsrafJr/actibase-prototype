from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config import TODAY_LABEL
from ..database import get_db
from ..deps import require_role
from ..utils import attendance_pct, eval_average, last_eval_date

router = APIRouter(prefix="/coach", tags=["coach"], dependencies=[Depends(require_role("coach"))])


def _current_coach(coach: models.User = Depends(require_role("coach"))) -> models.User:
    return coach


# ---- dashboard ----


@router.get("/dashboard", response_model=schemas.CoachDashboardOut)
def dashboard(db: Session = Depends(get_db), coach: models.User = Depends(_current_coach)):
    roster = db.query(models.User).filter(models.User.coach_id == coach.id, models.User.role == "player").all()
    sessions = db.query(models.TrainingSession).filter(models.TrainingSession.coach_id == coach.id).all()
    completed = [s for s in sessions if s.status == "Completed" and s.rate is not None]
    avg_rate = round(sum(s.rate for s in completed) / len(completed)) if completed else 0
    evaluated_player_ids = {
        e.player_id for e in db.query(models.Evaluation).filter(models.Evaluation.coach_id == coach.id).all()
    }
    return schemas.CoachDashboardOut(
        player_count=len(roster),
        todays_sessions=sum(1 for s in sessions if s.date == TODAY_LABEL),
        attendance_rate=avg_rate,
        pending_evaluations=sum(1 for p in roster if p.id not in evaluated_player_ids),
        upcoming_training=sum(1 for s in sessions if s.status == "Scheduled"),
        recent_feedback=db.query(models.Evaluation).filter(models.Evaluation.coach_id == coach.id).count(),
    )


# ---- roster ----


@router.get("/roster", response_model=list[schemas.RosterPlayerOut])
def roster(db: Session = Depends(get_db), coach: models.User = Depends(_current_coach)):
    players = db.query(models.User).filter(models.User.coach_id == coach.id, models.User.role == "player").order_by(models.User.name).all()
    return [
        schemas.RosterPlayerOut(
            id=p.id, name=p.name, year=p.year, position=p.position,
            attendance_pct=attendance_pct(db, p.id), last_eval=last_eval_date(db, p.id),
        )
        for p in players
    ]


# ---- sessions ----


def _session_out(db: Session, s: models.TrainingSession) -> schemas.SessionOut:
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


@router.get("/sessions", response_model=list[schemas.SessionOut])
def list_sessions(db: Session = Depends(get_db), coach: models.User = Depends(_current_coach)):
    sessions = db.query(models.TrainingSession).filter(models.TrainingSession.coach_id == coach.id).order_by(models.TrainingSession.id.desc()).all()
    return [_session_out(db, s) for s in sessions]


@router.post("/sessions", response_model=schemas.SessionOut, status_code=status.HTTP_201_CREATED)
def create_session(payload: schemas.SessionCreate, db: Session = Depends(get_db), coach: models.User = Depends(_current_coach)):
    if not payload.date.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "date is required")
    session = models.TrainingSession(
        coach_id=coach.id, date=payload.date, time=payload.time, type=payload.type,
        location=payload.location, sport=coach.sport, status="Scheduled",
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _session_out(db, session)


# ---- activities ----


@router.get("/activities", response_model=list[schemas.ActivityOut])
def list_activities(category: str | None = None, db: Session = Depends(get_db), coach: models.User = Depends(_current_coach)):
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
        out.append(item)
    return out


@router.post("/activities", response_model=schemas.ActivityOut, status_code=status.HTTP_201_CREATED)
def create_activity(payload: schemas.ActivityCreate, db: Session = Depends(get_db), coach: models.User = Depends(_current_coach)):
    if not payload.name.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "name is required")
    activity = models.Activity(
        coach_id=coach.id, name=payload.name, category=payload.category,
        duration=payload.duration, difficulty=payload.difficulty, description=payload.description,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    out = schemas.ActivityOut.model_validate(activity)
    out.assigned_session_ids = []
    return out


@router.post("/activities/{activity_id}/assign")
def assign_activity(activity_id: int, payload: schemas.AssignActivityRequest, db: Session = Depends(get_db), coach: models.User = Depends(_current_coach)):
    activity = db.get(models.Activity, activity_id)
    if activity is None or activity.coach_id != coach.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Activity not found")
    session = db.get(models.TrainingSession, payload.session_id)
    if session is None or session.coach_id != coach.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    exists = (
        db.query(models.ActivityAssignment)
        .filter(models.ActivityAssignment.activity_id == activity_id, models.ActivityAssignment.session_id == payload.session_id)
        .first()
    )
    if not exists:
        db.add(models.ActivityAssignment(activity_id=activity_id, session_id=payload.session_id))
        db.commit()
    return {"assigned": True}


# ---- attendance ----


@router.get("/attendance/{session_id}")
def get_attendance(session_id: int, db: Session = Depends(get_db), coach: models.User = Depends(_current_coach)):
    session = db.get(models.TrainingSession, session_id)
    if session is None or session.coach_id != coach.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    roster = db.query(models.User).filter(models.User.coach_id == coach.id, models.User.role == "player").order_by(models.User.name).all()
    marks = {
        r.player_id: r.status
        for r in db.query(models.AttendanceRecord).filter(models.AttendanceRecord.session_id == session_id).all()
    }
    return [
        {"player_id": p.id, "name": p.name, "position": p.position, "status": marks.get(p.id, "present")}
        for p in roster
    ]


@router.post("/attendance/{session_id}/mark")
def mark_attendance(session_id: int, payload: schemas.AttendanceMarkRequest, db: Session = Depends(get_db), coach: models.User = Depends(_current_coach)):
    session = db.get(models.TrainingSession, session_id)
    if session is None or session.coach_id != coach.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    if payload.status not in ("present", "late", "absent"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "status must be present, late, or absent")
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
    return {"ok": True}


@router.post("/attendance/{session_id}/mark-all-present")
def mark_all_present(session_id: int, db: Session = Depends(get_db), coach: models.User = Depends(_current_coach)):
    session = db.get(models.TrainingSession, session_id)
    if session is None or session.coach_id != coach.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    db.query(models.AttendanceRecord).filter(models.AttendanceRecord.session_id == session_id).delete()
    db.commit()
    return {"ok": True}


@router.post("/attendance/{session_id}/save", response_model=schemas.SessionOut)
def save_attendance(session_id: int, db: Session = Depends(get_db), coach: models.User = Depends(_current_coach)):
    session = db.get(models.TrainingSession, session_id)
    if session is None or session.coach_id != coach.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    roster = db.query(models.User).filter(models.User.coach_id == coach.id, models.User.role == "player").all()
    marks = {
        r.player_id: r.status
        for r in db.query(models.AttendanceRecord).filter(models.AttendanceRecord.session_id == session_id).all()
    }
    statuses = [marks.get(p.id, "present") for p in roster]
    present = sum(1 for s in statuses if s in ("present", "late"))
    total = len(statuses)
    session.status = "Completed"
    session.present = present
    session.absent = total - present
    session.total = total
    session.rate = round(present / total * 100) if total else 0
    db.commit()
    db.refresh(session)
    return _session_out(db, session)


# ---- evaluations ----


@router.get("/evaluations", response_model=list[schemas.EvaluationOut])
def list_evaluations(db: Session = Depends(get_db), coach: models.User = Depends(_current_coach)):
    evals = db.query(models.Evaluation).filter(models.Evaluation.coach_id == coach.id).order_by(models.Evaluation.id.desc()).all()
    out = []
    for e in evals:
        player = db.get(models.User, e.player_id)
        item = schemas.EvaluationOut.model_validate(e)
        item.player_name = player.name if player else "Unknown"
        out.append(item)
    return out


@router.post("/evaluations", response_model=schemas.EvaluationOut, status_code=status.HTTP_201_CREATED)
def create_evaluation(payload: schemas.EvaluationCreate, db: Session = Depends(get_db), coach: models.User = Depends(_current_coach)):
    player = db.get(models.User, payload.player_id)
    if player is None or player.coach_id != coach.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Player not found on your roster")
    evaluation = models.Evaluation(
        player_id=payload.player_id, coach_id=coach.id, date=TODAY_LABEL,
        skill=payload.skill, effort=payload.effort, teamwork=payload.teamwork,
        attitude=payload.attitude, comment=payload.comment,
    )
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)
    out = schemas.EvaluationOut.model_validate(evaluation)
    out.player_name = player.name
    return out


# ---- reports ----


@router.get("/reports", response_model=list[schemas.ReportOut])
def list_reports(db: Session = Depends(get_db), coach: models.User = Depends(_current_coach)):
    return db.query(models.Report).filter(models.Report.owner_role == "coach", models.Report.coach_id == coach.id).order_by(models.Report.id.desc()).all()


@router.post("/reports", response_model=schemas.ReportOut, status_code=status.HTTP_201_CREATED)
def generate_report(payload: schemas.ReportCreate, db: Session = Depends(get_db), coach: models.User = Depends(_current_coach)):
    report = models.Report(
        owner_role="coach", coach_id=coach.id, name=payload.name or "Untitled report",
        sport=coach.sport, range="Custom", generated_on="Just now", status="Ready",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


# ---- profile ----


@router.get("/profile", response_model=schemas.UserOut)
def get_profile(coach: models.User = Depends(_current_coach)):
    return coach


@router.patch("/profile", response_model=schemas.UserOut)
def update_profile(payload: schemas.ProfileUpdate, db: Session = Depends(get_db), coach: models.User = Depends(_current_coach)):
    for field in ("name", "sport", "email", "phone", "bio", "years_coaching"):
        value = getattr(payload, field)
        if value is not None:
            setattr(coach, field, value)
    db.commit()
    db.refresh(coach)
    return coach
