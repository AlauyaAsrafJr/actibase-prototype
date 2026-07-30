"""Compose the flat wire-format DTOs (schemas.UserOut / PlayerOut) from the
split system_users + players/coaches/admins tables. Kept in one place since
every router that returns account data needs the same joins.
"""

from . import models, schemas
from .utils import attendance_pct, last_eval_date


def full_name(first: str, last: str, middle: str | None = None) -> str:
    if middle:
        return f"{first} {middle} {last}".strip()
    return f"{first} {last}".strip()


def user_out(su: models.SystemUser, profile) -> schemas.UserOut:
    """profile is a Player, Coach, or Admin row matching su.role."""
    common = dict(
        id=su.user_id,
        email=profile.email,
        role=su.role,
        status=su.status,
        last_active=su.last_login or "Never",
        last_admin_action=su.last_admin_action,
    )
    if isinstance(profile, models.Player):
        return schemas.UserOut(
            **common,
            name=full_name(profile.first_name, profile.last_name, profile.middle_name),
            sport=profile.coach.specialization if profile.coach else None,
            position=profile.position,
            year=profile.year,
            phone=profile.contact_number,
            bio=profile.bio,
            coach_id=profile.coach_id,
        )
    if isinstance(profile, models.Coach):
        return schemas.UserOut(
            **common,
            name=full_name(profile.first_name, profile.last_name),
            sport=profile.specialization,
            phone=profile.contact_number,
            bio=profile.bio,
            years_coaching=profile.years_coaching,
        )
    # Admin
    return schemas.UserOut(
        **common,
        name=full_name(profile.first_name, profile.last_name),
    )


_ACCOUNT_PROFILE_MODEL = {"admin": models.Admin, "coach": models.Coach, "player": models.Player}


def account_name(db, su: models.SystemUser | None) -> str:
    """Resolve any account's display name regardless of role — used where
    the author of something (e.g. an announcement) could be any of the
    three account types."""
    if su is None:
        return "Unknown"
    model = _ACCOUNT_PROFILE_MODEL.get(su.role, models.Player)
    profile = db.query(model).filter(model.user_id == su.user_id).first()
    if profile is None:
        return "Unknown"
    return full_name(profile.first_name, profile.last_name, getattr(profile, "middle_name", None))


def announcement_out(db, a: models.Announcement, viewer_user_id: int) -> schemas.AnnouncementOut:
    author_su = db.get(models.SystemUser, a.author_id)
    if a.coach_id is not None:
        coach = db.get(models.Coach, a.coach_id)
        coach_name = full_name(coach.first_name, coach.last_name) if coach else "Coach"
        audience = f"{coach_name}'s team"
    elif a.sport:
        audience = f"{a.sport} — all coaches & players"
    else:
        audience = "Program-wide"
    return schemas.AnnouncementOut(
        id=a.announcement_id,
        title=a.title,
        body=a.body,
        author_name=account_name(db, author_su),
        author_role=author_su.role if author_su else "unknown",
        audience=audience,
        posted_date=a.posted_date,
        mine=(a.author_id == viewer_user_id),
    )


def player_out(db, su: models.SystemUser, player: models.Player) -> schemas.PlayerOut:
    coach_name = full_name(player.coach.first_name, player.coach.last_name) if player.coach else None
    return schemas.PlayerOut(
        id=player.player_id,
        user_id=su.user_id,
        name=full_name(player.first_name, player.last_name, player.middle_name),
        first_name=player.first_name,
        middle_name=player.middle_name,
        last_name=player.last_name,
        email=player.email,
        status=su.status,
        last_active=su.last_login or "Never",
        sport=player.coach.specialization if player.coach else None,
        position=player.position,
        year=player.year,
        phone=player.contact_number,
        bio=player.bio,
        coach_id=player.coach_id,
        attendance_pct=attendance_pct(db, player.player_id),
        last_eval=last_eval_date(db, player.player_id),
        coach_name=coach_name,
    )
