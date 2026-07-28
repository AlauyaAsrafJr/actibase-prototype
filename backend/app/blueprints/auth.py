from datetime import datetime, timezone

from flask import Blueprint, g, request

from .. import models, schemas
from ..auth import login_required
from ..database import get_db
from ..errors import ApiError
from ..http import json_response, parse_body
from ..security import create_access_token, hash_password, verify_password
from ..serializers import user_out

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

ALLOWED_REGISTER_ROLES = {"admin", "coach", "player"}
PROFILE_MODEL = {"player": models.Player, "coach": models.Coach, "admin": models.Admin}


def _split_name(name: str) -> tuple[str, str]:
    parts = name.strip().split(" ", 1)
    return (parts[0], parts[1] if len(parts) > 1 else "")


def _load_profile(db, su: models.SystemUser):
    model = PROFILE_MODEL[su.role]
    return db.query(model).filter(model.user_id == su.user_id).first()


@auth_bp.post("/register")
def register():
    payload = parse_body(schemas.RegisterRequest)
    role = payload.role.lower()
    if role not in ALLOWED_REGISTER_ROLES:
        raise ApiError("role must be admin, coach, or player", 400)
    if role in ("coach", "player") and not (payload.sport and payload.sport.strip()):
        raise ApiError("sport is required for coach and player accounts", 400)

    db = get_db()
    if db.query(models.SystemUser).filter(models.SystemUser.username == payload.email).first():
        raise ApiError("An account with this email already exists", 409)

    su = models.SystemUser(username=payload.email, password=hash_password(payload.password), role=role, status="Active")
    db.add(su)
    db.flush()

    first, last = _split_name(payload.name)
    if role == "player":
        profile = models.Player(user_id=su.user_id, first_name=first, last_name=last, email=payload.email)
    elif role == "coach":
        profile = models.Coach(user_id=su.user_id, first_name=first, last_name=last, email=payload.email, specialization=payload.sport)
    else:
        profile = models.Admin(user_id=su.user_id, first_name=first, last_name=last, email=payload.email)
    db.add(profile)
    db.commit()
    db.refresh(su)
    db.refresh(profile)
    return json_response(user_out(su, profile), 201)


@auth_bp.post("/login")
def login():
    payload = parse_body(schemas.LoginRequest)
    db = get_db()
    su = db.query(models.SystemUser).filter(models.SystemUser.username == payload.email).first()
    if su is None or not verify_password(payload.password, su.password):
        raise ApiError("Incorrect email or password", 401)
    if su.status == "Archived":
        raise ApiError("This account has been archived", 403)

    su.last_login = "Today"
    db.add(models.LoginHistory(
        user_id=su.user_id,
        ip_address=request.remote_addr,
        device_info=(request.headers.get("User-Agent") or "")[:255],
    ))
    db.commit()

    profile = _load_profile(db, su)
    token = create_access_token(su.user_id)
    return json_response(schemas.TokenResponse(access_token=token, user=user_out(su, profile)))


@auth_bp.post("/logout")
@login_required
def logout():
    db = get_db()
    su = g.current_user
    last_entry = (
        db.query(models.LoginHistory)
        .filter(models.LoginHistory.user_id == su.user_id, models.LoginHistory.logout_time.is_(None))
        .order_by(models.LoginHistory.log_id.desc())
        .first()
    )
    if last_entry:
        last_entry.logout_time = datetime.now(timezone.utc)
        db.commit()
    return json_response({"ok": True})


@auth_bp.get("/me")
@login_required
def me():
    db = get_db()
    su = g.current_user
    profile = _load_profile(db, su)
    return json_response(user_out(su, profile))
