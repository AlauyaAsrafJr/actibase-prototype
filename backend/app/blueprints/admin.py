from flask import Blueprint, g, request

from .. import models, schemas
from ..auth import require_role
from ..database import get_db
from ..errors import ApiError
from ..http import json_response, parse_body
from ..security import hash_password
from ..serializers import full_name, player_out, user_out
from ..utils import attendance_pct, report_summary

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")
admin_bp.before_request(require_role("admin"))

ACCOUNT_ROLES = ("admin", "coach")
PROFILE_MODEL = {"admin": models.Admin, "coach": models.Coach}
STATS_TYPES = ("Attendance Summary", "Performance Average", "Participation count", "Training performance")


def _profile_for(db, su: models.SystemUser):
    model = PROFILE_MODEL.get(su.role, models.Player)
    return db.query(model).filter(model.user_id == su.user_id).first()


# ---- dashboard ----


@admin_bp.get("/dashboard")
def dashboard():
    db = get_db()
    active_player_ids = [
        p.player_id
        for p, su in db.query(models.Player, models.SystemUser)
        .join(models.SystemUser, models.SystemUser.user_id == models.Player.user_id)
        .filter(models.SystemUser.status != "Archived")
        .all()
    ]
    active_coach_ids = [
        c.coach_id
        for c, su in db.query(models.Coach, models.SystemUser)
        .join(models.SystemUser, models.SystemUser.user_id == models.Coach.user_id)
        .filter(models.SystemUser.status != "Archived")
        .all()
    ]
    out = schemas.AdminDashboardOut(
        total_players=len(active_player_ids),
        total_coaches=len(active_coach_ids),
        total_users_active=db.query(models.SystemUser).filter(models.SystemUser.role.in_(ACCOUNT_ROLES), models.SystemUser.status == "Active").count(),
        total_sessions=db.query(models.TrainingActivity).count(),
        total_reports=db.query(models.ReportAnalytics).count(),
        archived_records=db.query(models.ArchivedRecord).count(),
    )
    return json_response(out)


# ---- users (admin/coach accounts) ----


@admin_bp.get("/users")
def list_users():
    db = get_db()
    rows = (
        db.query(models.SystemUser)
        .filter(models.SystemUser.role.in_(ACCOUNT_ROLES), models.SystemUser.status != "Archived")
        .all()
    )
    out = [user_out(su, _profile_for(db, su)) for su in rows]
    out.sort(key=lambda u: u.name)
    return json_response([o.model_dump() for o in out])


@admin_bp.post("/users")
def create_user():
    payload = parse_body(schemas.AdminUserCreate)
    role = payload.role.lower()
    if role not in ACCOUNT_ROLES:
        raise ApiError("role must be Admin or Coach", 400)
    db = get_db()
    if db.query(models.SystemUser).filter(models.SystemUser.username == payload.email).first():
        raise ApiError("An account with this email already exists", 409)

    su = models.SystemUser(username=payload.email, password=hash_password("changeme"), role=role, status="Active")
    db.add(su)
    db.flush()
    first, last = payload.name.strip().split(" ", 1) if " " in payload.name.strip() else (payload.name.strip(), "")
    if role == "coach":
        profile = models.Coach(user_id=su.user_id, first_name=first, last_name=last, email=payload.email)
    else:
        profile = models.Admin(user_id=su.user_id, first_name=first, last_name=last, email=payload.email)
    db.add(profile)
    db.commit()
    db.refresh(su)
    db.refresh(profile)
    return json_response(user_out(su, profile), 201)


def _archive_system_user(db, su: models.SystemUser, profile, archived_by_id: int, record_type: str, record_id: int) -> None:
    su.status = "Archived"
    db.add(models.ArchivedRecord(
        record_type=record_type,
        record_id=record_id,
        archive_data=full_name(profile.first_name, profile.last_name),
        archived_at="Just now",
        archived_by=archived_by_id,
    ))


@admin_bp.post("/users/<int:user_id>/archive")
def archive_user(user_id: int):
    db = get_db()
    su = db.get(models.SystemUser, user_id)
    if su is None or su.role not in ACCOUNT_ROLES:
        raise ApiError("User not found", 404)
    profile = _profile_for(db, su)
    _archive_system_user(db, su, profile, g.current_user.user_id, "User", su.user_id)
    db.commit()
    db.refresh(su)
    return json_response(user_out(su, profile))


@admin_bp.post("/users/archive-bulk")
def archive_users_bulk():
    payload = parse_body(schemas.BulkIds)
    db = get_db()
    rows = db.query(models.SystemUser).filter(models.SystemUser.user_id.in_(payload.ids), models.SystemUser.role.in_(ACCOUNT_ROLES)).all()
    for su in rows:
        _archive_system_user(db, su, _profile_for(db, su), g.current_user.user_id, "User", su.user_id)
    db.commit()
    return json_response({"archived": len(rows)})


@admin_bp.post("/users/<int:user_id>/deactivate")
def deactivate_user(user_id: int):
    db = get_db()
    su = db.get(models.SystemUser, user_id)
    if su is None or su.role not in ACCOUNT_ROLES:
        raise ApiError("User not found", 404)
    if su.status == "Archived":
        raise ApiError("Restore this account from the archive before deactivating it", 400)
    su.status = "Inactive" if su.status == "Active" else "Active"
    db.commit()
    db.refresh(su)
    return json_response(user_out(su, _profile_for(db, su)))


@admin_bp.post("/users/<int:user_id>/reset-password")
def reset_password(user_id: int):
    db = get_db()
    su = db.get(models.SystemUser, user_id)
    if su is None or su.role not in ACCOUNT_ROLES:
        raise ApiError("User not found", 404)
    su.password = hash_password("changeme")
    db.commit()
    return json_response(schemas.ResetPasswordOut(reset=True, new_password="changeme"))


@admin_bp.delete("/users/<int:user_id>")
def delete_user(user_id: int):
    db = get_db()
    su = db.get(models.SystemUser, user_id)
    if su is None or su.role not in ACCOUNT_ROLES:
        raise ApiError("User not found", 404)
    profile = _profile_for(db, su)
    if profile:
        db.delete(profile)
    db.delete(su)
    db.commit()
    return "", 204


# ---- players ----


@admin_bp.get("/players")
def list_players():
    db = get_db()
    rows = (
        db.query(models.Player, models.SystemUser)
        .join(models.SystemUser, models.SystemUser.user_id == models.Player.user_id)
        .filter(models.SystemUser.status != "Archived")
        .all()
    )
    out = [player_out(db, su, p) for p, su in rows]
    out.sort(key=lambda o: o.name)
    return json_response([o.model_dump() for o in out])


@admin_bp.post("/players/<int:player_id>/archive")
def archive_player(player_id: int):
    db = get_db()
    player = db.get(models.Player, player_id)
    if player is None:
        raise ApiError("Player not found", 404)
    su = db.get(models.SystemUser, player.user_id)
    _archive_system_user(db, su, player, g.current_user.user_id, "Player", player.player_id)
    db.commit()
    db.refresh(su)
    return json_response(user_out(su, player))


@admin_bp.post("/players/archive-bulk")
def archive_players_bulk():
    payload = parse_body(schemas.BulkIds)
    db = get_db()
    players = db.query(models.Player).filter(models.Player.player_id.in_(payload.ids)).all()
    for player in players:
        su = db.get(models.SystemUser, player.user_id)
        _archive_system_user(db, su, player, g.current_user.user_id, "Player", player.player_id)
    db.commit()
    return json_response({"archived": len(players)})


@admin_bp.delete("/players/<int:player_id>")
def delete_player(player_id: int):
    db = get_db()
    player = db.get(models.Player, player_id)
    if player is None:
        raise ApiError("Player not found", 404)
    su = db.get(models.SystemUser, player.user_id)
    db.delete(player)
    if su:
        db.delete(su)
    db.commit()
    return "", 204


# ---- training activities (program-wide) ----


def _activity_out(db, a: models.TrainingActivity) -> schemas.SessionOut:
    roster = db.query(models.Player).filter(models.Player.coach_id == a.coach_id).all()
    marks = {
        m.player_id: m.status
        for m in db.query(models.Attendance)
        .filter(models.Attendance.coach_id == a.coach_id, models.Attendance.date == a.activity_date)
        .all()
    }
    # Missing entries default to "present" — matches mark-all-present, which
    # clears explicit rows rather than writing one per player.
    statuses = [marks.get(p.player_id, "present") for p in roster]
    present = sum(1 for s in statuses if s in ("present", "late"))
    roster_size = len(roster)
    finalized = a.status == "Completed"
    coach = db.get(models.Coach, a.coach_id)
    return schemas.SessionOut(
        id=a.activity_id,
        date=a.activity_date,
        time=a.time or "",
        type=a.activity_name,
        location=a.location or "",
        sport=coach.specialization if coach else None,
        status=a.status,
        present=present if finalized else None,
        absent=(roster_size - present) if finalized else None,
        total=roster_size if finalized else None,
        rate=round(present / roster_size * 100) if finalized and roster_size else (0 if finalized else None),
    )


@admin_bp.get("/sessions")
def list_sessions():
    db = get_db()
    sport = request.args.get("sport")
    q = db.query(models.TrainingActivity)
    if sport:
        q = q.join(models.Coach, models.Coach.coach_id == models.TrainingActivity.coach_id).filter(models.Coach.specialization == sport)
    activities = q.order_by(models.TrainingActivity.activity_id.desc()).all()
    return json_response([_activity_out(db, a).model_dump() for a in activities])


# ---- reports ----


@admin_bp.get("/reports")
def list_reports():
    sport = request.args.get("sport")
    db = get_db()
    q = (
        db.query(models.ReportAnalytics)
        .join(models.SystemUser, models.SystemUser.user_id == models.ReportAnalytics.generated_by)
        .filter(models.SystemUser.role == "admin")
    )
    if sport and sport != "all":
        q = q.filter((models.ReportAnalytics.sport == sport) | (models.ReportAnalytics.sport == "All sports"))
    reports = q.order_by(models.ReportAnalytics.report_id.desc()).all()
    out = [
        schemas.ReportOut(id=r.report_id, name=r.title, sport=r.sport, range=r.range, generated_on=r.generated_date, status=r.status, details=r.details)
        for r in reports
    ]
    return json_response([o.model_dump() for o in out])


@admin_bp.post("/reports")
def generate_report():
    payload = parse_body(schemas.ReportCreate)
    db = get_db()
    sport = payload.sport or "All sports"
    report = models.ReportAnalytics(
        report_type="Training",
        generated_by=g.current_user.user_id,
        generated_date="Just now",
        title=payload.name or "Untitled report",
        sport=sport,
        range="Custom",
        status="Ready",
        details=report_summary(db, sport),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    out = schemas.ReportOut(id=report.report_id, name=report.title, sport=report.sport, range=report.range, generated_on=report.generated_date, status=report.status, details=report.details)
    return json_response(out, 201)


# ---- statistics ----


@admin_bp.get("/statistics")
def list_statistics():
    db = get_db()
    rows = db.query(models.Statistic).order_by(models.Statistic.stats_id.desc()).all()
    out = []
    for s in rows:
        su = db.get(models.SystemUser, s.generated_by)
        profile = _profile_for(db, su) if su else None
        name = full_name(profile.first_name, profile.last_name) if profile else "Unknown"
        out.append(schemas.StatisticOut(id=s.stats_id, stats_type=s.stats_type, description=s.description, data_payload=s.data_payload, generated_date=s.generated_date, generated_by_name=name))
    return json_response([o.model_dump() for o in out])


@admin_bp.post("/statistics")
def generate_statistic():
    payload = parse_body(schemas.StatisticCreate)
    if payload.stats_type not in STATS_TYPES:
        raise ApiError(f"stats_type must be one of: {', '.join(STATS_TYPES)}", 400)
    db = get_db()

    if payload.stats_type == "Attendance Summary":
        player_ids = [p.player_id for p in db.query(models.Player).all()]
        pct = round(sum(attendance_pct(db, pid) for pid in player_ids) / len(player_ids), 1) if player_ids else 0.0
        payload_str = f"{pct}% average attendance across {len(player_ids)} players"
    elif payload.stats_type == "Performance Average":
        feedbacks = db.query(models.PerformanceFeedback).all()
        avg = round(sum(f.rating for f in feedbacks) / len(feedbacks), 1) if feedbacks else 0.0
        payload_str = f"{avg}/5 average performance rating across {len(feedbacks)} evaluations"
    elif payload.stats_type == "Participation count":
        count = db.query(models.Participation).count()
        payload_str = f"{count} total participation records"
    else:  # Training performance
        count = db.query(models.TrainingActivity).filter(models.TrainingActivity.status == "Completed").count()
        payload_str = f"{count} completed training activities"

    stat = models.Statistic(
        stats_type=payload.stats_type,
        generated_by=g.current_user.user_id,
        description=payload.description or "",
        data_payload=payload_str,
        generated_date="Just now",
    )
    db.add(stat)
    db.commit()
    db.refresh(stat)
    su = g.current_user
    profile = _profile_for(db, su)
    out = schemas.StatisticOut(
        id=stat.stats_id, stats_type=stat.stats_type, description=stat.description,
        data_payload=stat.data_payload, generated_date=stat.generated_date,
        generated_by_name=full_name(profile.first_name, profile.last_name) if profile else "Unknown",
    )
    return json_response(out, 201)


# ---- login history ----


@admin_bp.get("/login-history")
def list_login_history():
    db = get_db()
    rows = db.query(models.LoginHistory).order_by(models.LoginHistory.log_id.desc()).limit(200).all()
    out = []
    for entry in rows:
        su = db.get(models.SystemUser, entry.user_id)
        profile = _profile_for(db, su) if su else None
        name = full_name(profile.first_name, profile.last_name) if profile else "Unknown"
        out.append(schemas.LoginHistoryOut(
            id=entry.log_id, user_name=name, role=su.role if su else "unknown",
            login_time=entry.login_time.isoformat(), logout_time=entry.logout_time.isoformat() if entry.logout_time else None,
            ip_address=entry.ip_address, device_info=entry.device_info,
        ))
    return json_response([o.model_dump() for o in out])


# ---- system health ----


@admin_bp.get("/health")
def system_health():
    db = get_db()
    try:
        db.query(models.SystemUser).first()
        database_status = "connected"
    except Exception:
        database_status = "error"
    return json_response({"status": "ok", "database": database_status})


# ---- archive ----


@admin_bp.get("/archive")
def list_archive():
    type_ = request.args.get("type")
    db = get_db()
    q = db.query(models.ArchivedRecord)
    if type_ and type_ != "all":
        q = q.filter(models.ArchivedRecord.record_type == type_)
    records = q.order_by(models.ArchivedRecord.archive_id.desc()).all()
    out = []
    for r in records:
        by_su = db.get(models.SystemUser, r.archived_by) if r.archived_by else None
        by_profile = _profile_for(db, by_su) if by_su else None
        by_name = full_name(by_profile.first_name, by_profile.last_name) if by_profile else "System"
        out.append(schemas.ArchiveOut(id=r.archive_id, name=r.archive_data, type=r.record_type, archived_on=r.archived_at, archived_by=by_name))
    return json_response([o.model_dump() for o in out])


@admin_bp.post("/archive/<int:record_id>/restore")
def restore_archive(record_id: int):
    db = get_db()
    record = db.get(models.ArchivedRecord, record_id)
    if record is None:
        raise ApiError("Archive record not found", 404)
    if record.record_type == "Player" and record.record_id:
        player = db.get(models.Player, record.record_id)
        if player:
            su = db.get(models.SystemUser, player.user_id)
            if su:
                su.status = "Active"
    elif record.record_type == "User" and record.record_id:
        su = db.get(models.SystemUser, record.record_id)
        if su:
            su.status = "Active"
    db.delete(record)
    db.commit()
    return json_response({"restored": True})


@admin_bp.delete("/archive/<int:record_id>")
def delete_archive_forever(record_id: int):
    db = get_db()
    record = db.get(models.ArchivedRecord, record_id)
    if record is None:
        raise ApiError("Archive record not found", 404)

    su_to_delete = None
    profile_to_delete = None
    if record.record_type == "Player" and record.record_id:
        player = db.get(models.Player, record.record_id)
        if player:
            su_to_delete = db.get(models.SystemUser, player.user_id)
            profile_to_delete = player
    elif record.record_type == "User" and record.record_id:
        su_to_delete = db.get(models.SystemUser, record.record_id)
        if su_to_delete:
            profile_to_delete = _profile_for(db, su_to_delete)

    db.delete(record)
    db.flush()
    if profile_to_delete:
        db.delete(profile_to_delete)
    if su_to_delete:
        db.delete(su_to_delete)
    db.commit()
    return "", 204
