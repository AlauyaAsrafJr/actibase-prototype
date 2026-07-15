from flask import Blueprint, g

from .. import models, schemas
from ..auth import login_required
from ..database import get_db
from ..errors import ApiError
from ..http import dump, json_response, parse_body
from ..security import create_access_token, hash_password, verify_password

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

ALLOWED_REGISTER_ROLES = {"admin", "coach", "player"}


@auth_bp.post("/register")
def register():
    payload = parse_body(schemas.RegisterRequest)
    role = payload.role.lower()
    if role not in ALLOWED_REGISTER_ROLES:
        raise ApiError("role must be admin, coach, or player", 400)
    if role in ("coach", "player") and not (payload.sport and payload.sport.strip()):
        raise ApiError("sport is required for coach and player accounts", 400)

    db = get_db()
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise ApiError("An account with this email already exists", 409)

    user = models.User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=role,
        sport=payload.sport,
        status="Active",
        last_active="Just now",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return json_response(dump(schemas.UserOut, user), 201)


@auth_bp.post("/login")
def login():
    payload = parse_body(schemas.LoginRequest)
    db = get_db()
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise ApiError("Incorrect email or password", 401)
    if user.status == "Archived":
        raise ApiError("This account has been archived", 403)
    user.last_active = "Today"
    db.commit()
    token = create_access_token(user.id)
    return json_response(schemas.TokenResponse(access_token=token, user=user))


@auth_bp.get("/me")
@login_required
def me():
    return json_response(dump(schemas.UserOut, g.current_user))
