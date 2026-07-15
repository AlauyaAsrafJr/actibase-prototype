from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    """Every login-capable account: admin, coach, staff, or player.

    Role-specific fields (sport, position, year, phone, bio,
    years_coaching, coach_id) are nullable and only populated for the
    roles that use them — kept on one table since Register.dc.html
    treats all three roles as one identity system.
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20))  # admin | coach | staff | player

    status: Mapped[str] = mapped_column(String(20), default="Active")  # Active | Inactive | Archived
    last_active: Mapped[str] = mapped_column(String(40), default="Just now")

    sport: Mapped[str | None] = mapped_column(String(60), nullable=True)
    position: Mapped[str | None] = mapped_column(String(60), nullable=True)  # player only
    year: Mapped[str | None] = mapped_column(String(30), nullable=True)  # player only, e.g. "Senior"
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    years_coaching: Mapped[str | None] = mapped_column(String(20), nullable=True)  # coach only
    coach_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)  # player -> coach

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    coach: Mapped["User | None"] = relationship(remote_side=[id])


class TrainingSession(Base):
    __tablename__ = "training_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    coach_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    date: Mapped[str] = mapped_column(String(40))
    time: Mapped[str] = mapped_column(String(20))
    type: Mapped[str] = mapped_column(String(20))  # Practice | Scrimmage | Game
    location: Mapped[str] = mapped_column(String(120))
    sport: Mapped[str | None] = mapped_column(String(60), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Scheduled")  # Scheduled | Completed
    present: Mapped[int | None] = mapped_column(Integer, nullable=True)
    absent: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rate: Mapped[int | None] = mapped_column(Integer, nullable=True)


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(primary_key=True)
    coach_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(60))
    duration: Mapped[str] = mapped_column(String(20))
    difficulty: Mapped[str] = mapped_column(String(20))  # Beginner | Intermediate | Advanced
    description: Mapped[str] = mapped_column(Text)


class ActivityAssignment(Base):
    __tablename__ = "activity_assignments"
    __table_args__ = (UniqueConstraint("activity_id", "session_id", name="uq_activity_session"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    activity_id: Mapped[int] = mapped_column(ForeignKey("activities.id"))
    session_id: Mapped[int] = mapped_column(ForeignKey("training_sessions.id"))


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    __table_args__ = (UniqueConstraint("session_id", "player_id", name="uq_session_player"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("training_sessions.id"))
    player_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(20), default="present")  # present | late | absent


class Evaluation(Base):
    __tablename__ = "evaluations"

    id: Mapped[int] = mapped_column(primary_key=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    coach_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    date: Mapped[str] = mapped_column(String(40))
    skill: Mapped[int] = mapped_column(Integer)
    effort: Mapped[int] = mapped_column(Integer)
    teamwork: Mapped[int] = mapped_column(Integer)
    attitude: Mapped[int] = mapped_column(Integer)
    comment: Mapped[str] = mapped_column(Text, default="")


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_role: Mapped[str] = mapped_column(String(20))  # admin | coach
    coach_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(160))
    sport: Mapped[str | None] = mapped_column(String(60), nullable=True)
    range: Mapped[str] = mapped_column(String(60))
    generated_on: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(20), default="Ready")  # Ready | Generating


class ArchiveRecord(Base):
    __tablename__ = "archive_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    type: Mapped[str] = mapped_column(String(20))  # Player | User | Session
    archived_on: Mapped[str] = mapped_column(String(40))
    archived_by: Mapped[str] = mapped_column(String(120))
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
