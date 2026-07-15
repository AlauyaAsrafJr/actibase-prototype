from functools import wraps

from flask import g, request

from . import models
from .database import get_db
from .errors import ApiError
from .security import decode_access_token


def _authenticate() -> models.User:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise ApiError("Missing bearer token", 401)
    token = auth_header[len("Bearer "):]
    user_id = decode_access_token(token)
    if user_id is None:
        raise ApiError("Invalid or expired token", 401)
    user = get_db().get(models.User, user_id)
    if user is None or user.status == "Archived":
        raise ApiError("User no longer exists", 401)
    return user


def login_required(fn):
    """Route-level guard for endpoints open to any authenticated role."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        g.current_user = _authenticate()
        return fn(*args, **kwargs)

    return wrapper


def require_role(*roles: str):
    """Blueprint-level guard: register with `blueprint.before_request(require_role("admin"))`."""

    def hook():
        user = _authenticate()
        if user.role not in roles:
            raise ApiError(f"Requires role: {', '.join(roles)}", 403)
        g.current_user = user

    return hook
