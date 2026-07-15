from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import require_role
from ..security import hash_password
from ..utils import attendance_pct, last_eval_date

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_role("admin"))])

ACCOUNT_ROLES = ("admin", "coach", "staff")


# ---- dashboard ----


@router.get("/dashboard", response_model=schemas.AdminDashboardOut)
def dashboard(db: Session = Depends(get_db)):
    return schemas.AdminDashboardOut(
        total_players=db.query(models.User).filter(models.User.role == "player", models.User.status != "Archived").count(),
        total_coaches=db.query(models.User).filter(models.User.role == "coach", models.User.status != "Archived").count(),
        total_users_active=db.query(models.User).filter(models.User.role.in_(ACCOUNT_ROLES), models.User.status == "Active").count(),
        total_sessions=db.query(models.TrainingSession).count(),
        total_reports=db.query(models.Report).count(),
        archived_records=db.query(models.ArchiveRecord).count(),
    )


# ---- users (admin/coach/staff accounts) ----


@router.get("/users", response_model=list[schemas.UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).filter(models.User.role.in_(ACCOUNT_ROLES), models.User.status != "Archived").order_by(models.User.name).all()


@router.post("/users", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: schemas.AdminUserCreate, db: Session = Depends(get_db)):
    role = payload.role.lower()
    if role not in ACCOUNT_ROLES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "role must be Admin, Coach, or Staff")
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    user = models.User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password("changeme"),
        role=role,
        status="Active",
        last_active="Just now",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _archive_user(db: Session, user: models.User, archived_by: str, type_label: str) -> None:
    user.status = "Archived"
    db.add(models.ArchiveRecord(name=user.name, type=type_label, archived_on="Just now", archived_by=archived_by, user_id=user.id))


@router.post("/users/{user_id}/archive", response_model=schemas.UserOut)
def archive_user(user_id: int, db: Session = Depends(get_db), admin: models.User = Depends(require_role("admin"))):
    user = db.get(models.User, user_id)
    if user is None or user.role not in ACCOUNT_ROLES:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    _archive_user(db, user, admin.name, "User")
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/archive-bulk")
def archive_users_bulk(payload: schemas.BulkIds, db: Session = Depends(get_db), admin: models.User = Depends(require_role("admin"))):
    users = db.query(models.User).filter(models.User.id.in_(payload.ids), models.User.role.in_(ACCOUNT_ROLES)).all()
    for user in users:
        _archive_user(db, user, admin.name, "User")
    db.commit()
    return {"archived": len(users)}


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.get(models.User, user_id)
    if user is None or user.role not in ACCOUNT_ROLES:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    db.delete(user)
    db.commit()


# ---- players ----


def _player_out(db: Session, player: models.User) -> schemas.PlayerOut:
    return schemas.PlayerOut(
        **schemas.UserOut.model_validate(player).model_dump(),
        attendance_pct=attendance_pct(db, player.id),
        last_eval=last_eval_date(db, player.id),
        coach_name=player.coach.name if player.coach else None,
    )


@router.get("/players", response_model=list[schemas.PlayerOut])
def list_players(db: Session = Depends(get_db)):
    players = db.query(models.User).filter(models.User.role == "player", models.User.status != "Archived").order_by(models.User.name).all()
    return [_player_out(db, p) for p in players]


@router.post("/players/{player_id}/archive", response_model=schemas.UserOut)
def archive_player(player_id: int, db: Session = Depends(get_db), admin: models.User = Depends(require_role("admin"))):
    player = db.get(models.User, player_id)
    if player is None or player.role != "player":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Player not found")
    _archive_user(db, player, admin.name, "Player")
    db.commit()
    db.refresh(player)
    return player


@router.post("/players/archive-bulk")
def archive_players_bulk(payload: schemas.BulkIds, db: Session = Depends(get_db), admin: models.User = Depends(require_role("admin"))):
    players = db.query(models.User).filter(models.User.id.in_(payload.ids), models.User.role == "player").all()
    for player in players:
        _archive_user(db, player, admin.name, "Player")
    db.commit()
    return {"archived": len(players)}


@router.delete("/players/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_player(player_id: int, db: Session = Depends(get_db)):
    player = db.get(models.User, player_id)
    if player is None or player.role != "player":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Player not found")
    db.delete(player)
    db.commit()


# ---- attendance sessions (program-wide) ----


@router.get("/sessions", response_model=list[schemas.SessionOut])
def list_sessions(sport: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.TrainingSession)
    if sport:
        q = q.filter(models.TrainingSession.sport == sport)
    sessions = q.order_by(models.TrainingSession.id.desc()).all()
    out = []
    for s in sessions:
        names = [
            a.name
            for a in db.query(models.Activity)
            .join(models.ActivityAssignment, models.ActivityAssignment.activity_id == models.Activity.id)
            .filter(models.ActivityAssignment.session_id == s.id)
            .all()
        ]
        session_out = schemas.SessionOut.model_validate(s)
        session_out.activity_names = names
        out.append(session_out)
    return out


# ---- reports ----


@router.get("/reports", response_model=list[schemas.ReportOut])
def list_reports(sport: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Report).filter(models.Report.owner_role == "admin")
    if sport and sport != "all":
        q = q.filter((models.Report.sport == sport) | (models.Report.sport == "All sports"))
    return q.order_by(models.Report.id.desc()).all()


@router.post("/reports", response_model=schemas.ReportOut, status_code=status.HTTP_201_CREATED)
def generate_report(payload: schemas.ReportCreate, db: Session = Depends(get_db)):
    report = models.Report(
        owner_role="admin",
        name=payload.name or "Untitled report",
        sport=payload.sport or "All sports",
        range="Custom",
        generated_on="Just now",
        status="Ready",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


# ---- archive ----


@router.get("/archive", response_model=list[schemas.ArchiveOut])
def list_archive(type: str | None = None, db: Session = Depends(get_db)):
    q = db.query(models.ArchiveRecord)
    if type and type != "all":
        q = q.filter(models.ArchiveRecord.type == type)
    return q.order_by(models.ArchiveRecord.id.desc()).all()


@router.post("/archive/{record_id}/restore")
def restore_archive(record_id: int, db: Session = Depends(get_db)):
    record = db.get(models.ArchiveRecord, record_id)
    if record is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Archive record not found")
    if record.user_id:
        user = db.get(models.User, record.user_id)
        if user:
            user.status = "Active"
    db.delete(record)
    db.commit()
    return {"restored": True}


@router.delete("/archive/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_archive_forever(record_id: int, db: Session = Depends(get_db)):
    record = db.get(models.ArchiveRecord, record_id)
    if record is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Archive record not found")
    if record.user_id:
        user = db.get(models.User, record.user_id)
        if user:
            db.delete(user)
    db.delete(record)
    db.commit()
