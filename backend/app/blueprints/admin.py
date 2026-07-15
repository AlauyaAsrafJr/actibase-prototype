from flask import Blueprint, g, request

from .. import models, schemas
from ..auth import require_role
from ..database import get_db
from ..errors import ApiError
from ..http import dump, dump_list, json_response, parse_body
from ..security import hash_password
from ..utils import attendance_pct, last_eval_date

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")
admin_bp.before_request(require_role("admin"))

ACCOUNT_ROLES = ("admin", "coach", "staff")


# ---- dashboard ----


@admin_bp.get("/dashboard")
def dashboard():
    db = get_db()
    out = schemas.AdminDashboardOut(
        total_players=db.query(models.User).filter(models.User.role == "player", models.User.status != "Archived").count(),
        total_coaches=db.query(models.User).filter(models.User.role == "coach", models.User.status != "Archived").count(),
        total_users_active=db.query(models.User).filter(models.User.role.in_(ACCOUNT_ROLES), models.User.status == "Active").count(),
        total_sessions=db.query(models.TrainingSession).count(),
        total_reports=db.query(models.Report).count(),
        archived_records=db.query(models.ArchiveRecord).count(),
    )
    return json_response(out)


# ---- users (admin/coach/staff accounts) ----


@admin_bp.get("/users")
def list_users():
    db = get_db()
    users = db.query(models.User).filter(models.User.role.in_(ACCOUNT_ROLES), models.User.status != "Archived").order_by(models.User.name).all()
    return json_response(dump_list(schemas.UserOut, users))


@admin_bp.post("/users")
def create_user():
    payload = parse_body(schemas.AdminUserCreate)
    role = payload.role.lower()
    if role not in ACCOUNT_ROLES:
        raise ApiError("role must be Admin, Coach, or Staff", 400)
    db = get_db()
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise ApiError("An account with this email already exists", 409)
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
    return json_response(dump(schemas.UserOut, user), 201)


def _archive_user(db, user: models.User, archived_by: str, type_label: str) -> None:
    user.status = "Archived"
    db.add(models.ArchiveRecord(name=user.name, type=type_label, archived_on="Just now", archived_by=archived_by, user_id=user.id))


@admin_bp.post("/users/<int:user_id>/archive")
def archive_user(user_id: int):
    db = get_db()
    user = db.get(models.User, user_id)
    if user is None or user.role not in ACCOUNT_ROLES:
        raise ApiError("User not found", 404)
    _archive_user(db, user, g.current_user.name, "User")
    db.commit()
    db.refresh(user)
    return json_response(dump(schemas.UserOut, user))


@admin_bp.post("/users/archive-bulk")
def archive_users_bulk():
    payload = parse_body(schemas.BulkIds)
    db = get_db()
    users = db.query(models.User).filter(models.User.id.in_(payload.ids), models.User.role.in_(ACCOUNT_ROLES)).all()
    for user in users:
        _archive_user(db, user, g.current_user.name, "User")
    db.commit()
    return json_response({"archived": len(users)})


@admin_bp.delete("/users/<int:user_id>")
def delete_user(user_id: int):
    db = get_db()
    user = db.get(models.User, user_id)
    if user is None or user.role not in ACCOUNT_ROLES:
        raise ApiError("User not found", 404)
    db.delete(user)
    db.commit()
    return "", 204


# ---- players ----


def _player_out(db, player: models.User) -> schemas.PlayerOut:
    return schemas.PlayerOut(
        **schemas.UserOut.model_validate(player).model_dump(),
        attendance_pct=attendance_pct(db, player.id),
        last_eval=last_eval_date(db, player.id),
        coach_name=player.coach.name if player.coach else None,
    )


@admin_bp.get("/players")
def list_players():
    db = get_db()
    players = db.query(models.User).filter(models.User.role == "player", models.User.status != "Archived").order_by(models.User.name).all()
    return json_response([_player_out(db, p).model_dump() for p in players])


@admin_bp.post("/players/<int:player_id>/archive")
def archive_player(player_id: int):
    db = get_db()
    player = db.get(models.User, player_id)
    if player is None or player.role != "player":
        raise ApiError("Player not found", 404)
    _archive_user(db, player, g.current_user.name, "Player")
    db.commit()
    db.refresh(player)
    return json_response(dump(schemas.UserOut, player))


@admin_bp.post("/players/archive-bulk")
def archive_players_bulk():
    payload = parse_body(schemas.BulkIds)
    db = get_db()
    players = db.query(models.User).filter(models.User.id.in_(payload.ids), models.User.role == "player").all()
    for player in players:
        _archive_user(db, player, g.current_user.name, "Player")
    db.commit()
    return json_response({"archived": len(players)})


@admin_bp.delete("/players/<int:player_id>")
def delete_player(player_id: int):
    db = get_db()
    player = db.get(models.User, player_id)
    if player is None or player.role != "player":
        raise ApiError("Player not found", 404)
    db.delete(player)
    db.commit()
    return "", 204


# ---- attendance sessions (program-wide) ----


@admin_bp.get("/sessions")
def list_sessions():
    db = get_db()
    sport = request.args.get("sport")
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
        out.append(session_out.model_dump())
    return json_response(out)


# ---- reports ----


@admin_bp.get("/reports")
def list_reports():
    sport = request.args.get("sport")
    db = get_db()
    q = db.query(models.Report).filter(models.Report.owner_role == "admin")
    if sport and sport != "all":
        q = q.filter((models.Report.sport == sport) | (models.Report.sport == "All sports"))
    reports = q.order_by(models.Report.id.desc()).all()
    return json_response(dump_list(schemas.ReportOut, reports))


@admin_bp.post("/reports")
def generate_report():
    payload = parse_body(schemas.ReportCreate)
    db = get_db()
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
    return json_response(dump(schemas.ReportOut, report), 201)


# ---- archive ----


@admin_bp.get("/archive")
def list_archive():
    type_ = request.args.get("type")
    db = get_db()
    q = db.query(models.ArchiveRecord)
    if type_ and type_ != "all":
        q = q.filter(models.ArchiveRecord.type == type_)
    records = q.order_by(models.ArchiveRecord.id.desc()).all()
    return json_response(dump_list(schemas.ArchiveOut, records))


@admin_bp.post("/archive/<int:record_id>/restore")
def restore_archive(record_id: int):
    db = get_db()
    record = db.get(models.ArchiveRecord, record_id)
    if record is None:
        raise ApiError("Archive record not found", 404)
    if record.user_id:
        user = db.get(models.User, record.user_id)
        if user:
            user.status = "Active"
    db.delete(record)
    db.commit()
    return json_response({"restored": True})


@admin_bp.delete("/archive/<int:record_id>")
def delete_archive_forever(record_id: int):
    db = get_db()
    record = db.get(models.ArchiveRecord, record_id)
    if record is None:
        raise ApiError("Archive record not found", 404)
    user = db.get(models.User, record.user_id) if record.user_id else None
    db.delete(record)
    db.flush()
    if user:
        db.delete(user)
    db.commit()
    return "", 204
