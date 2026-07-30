from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SystemUser(Base):
    """Central login/account table — matches "System User" in the approved
    ERD (Figure 3.2.4). Profile details live on the role-specific table
    (Player / Coach / Admin), each in a one-to-one relationship with this
    table via user_id.
    """

    __tablename__ = "system_users"

    user_id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password: Mapped[str] = mapped_column(String(255))  # bcrypt hash
    role: Mapped[str] = mapped_column(String(20))  # player | coach | admin
    last_login: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    # Additive — the ERD only puts membership_status on Player, but the use-case
    # diagram's "Deactivate users" / "Retrieve Archived Records" apply to any
    # system user, so account status lives centrally here.
    status: Mapped[str] = mapped_column(String(20), default="Active")  # Active | Inactive | Archived

    # Additive — lightweight accountability for actions (reset password,
    # deactivate) that don't otherwise produce a row anywhere else, unlike
    # archiving which is recorded in ArchivedRecord.
    last_admin_action: Mapped[str | None] = mapped_column(String(200), nullable=True)


class Player(Base):
    __tablename__ = "players"

    player_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("system_users.user_id"), unique=True)
    first_name: Mapped[str] = mapped_column(String(80))
    last_name: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(String(255))
    contact_number: Mapped[str | None] = mapped_column(String(40), nullable=True)
    date_of_number: Mapped[str | None] = mapped_column(String(40), nullable=True)
    date_of_birth: Mapped[str | None] = mapped_column(String(40), nullable=True)
    profile_photo: Mapped[str | None] = mapped_column(String(255), nullable=True)
    membership_status: Mapped[str] = mapped_column(String(20), default="Active")  # Active | Inactive | Archived

    # Additive — not in the ERD, kept so the existing roster/profile UI
    # (position, class year, coach linkage, bio) keeps working.
    middle_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    position: Mapped[str | None] = mapped_column(String(60), nullable=True)
    year: Mapped[str | None] = mapped_column(String(30), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    coach_id: Mapped[int | None] = mapped_column(ForeignKey("coaches.coach_id"), nullable=True)

    user: Mapped["SystemUser"] = relationship()
    coach: Mapped["Coach | None"] = relationship()


class Coach(Base):
    __tablename__ = "coaches"

    coach_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("system_users.user_id"), unique=True)
    first_name: Mapped[str] = mapped_column(String(80))
    last_name: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(String(255))
    contact_number: Mapped[str | None] = mapped_column(String(40), nullable=True)
    specialization: Mapped[str | None] = mapped_column(String(60), nullable=True)  # sport

    # Additive:
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    years_coaching: Mapped[str | None] = mapped_column(String(20), nullable=True)

    user: Mapped["SystemUser"] = relationship()


class Admin(Base):
    __tablename__ = "admins"

    admin_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("system_users.user_id"), unique=True)
    first_name: Mapped[str] = mapped_column(String(80))
    last_name: Mapped[str] = mapped_column(String(80))
    email: Mapped[str] = mapped_column(String(255))

    user: Mapped["SystemUser"] = relationship()


class TrainingActivity(Base):
    __tablename__ = "training_activities"

    activity_id: Mapped[int] = mapped_column(primary_key=True)
    coach_id: Mapped[int] = mapped_column(ForeignKey("coaches.coach_id"))
    activity_name: Mapped[str] = mapped_column(String(160))
    activity_date: Mapped[str] = mapped_column(String(40))
    duration: Mapped[str | None] = mapped_column(String(20), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Additive — not in the ERD, kept for the existing scheduling workflow:
    time: Mapped[str | None] = mapped_column(String(20), nullable=True)
    location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Scheduled")  # Scheduled | Completed


class Participation(Base):
    __tablename__ = "participations"
    __table_args__ = (UniqueConstraint("player_id", "activity_id", name="uq_player_activity"),)

    participation_id: Mapped[int] = mapped_column(primary_key=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.player_id"))
    activity_id: Mapped[int] = mapped_column(ForeignKey("training_activities.activity_id"))
    participation_status: Mapped[str] = mapped_column(String(20), default="Joined")


class Attendance(Base):
    __tablename__ = "attendances"
    __table_args__ = (UniqueConstraint("player_id", "coach_id", "date", name="uq_player_coach_date"),)

    attendance_id: Mapped[int] = mapped_column(primary_key=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.player_id"))
    coach_id: Mapped[int] = mapped_column(ForeignKey("coaches.coach_id"))
    date: Mapped[str] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(20), default="present")  # present | absent | late


class PerformanceFeedback(Base):
    __tablename__ = "performance_feedback"

    feedback_id: Mapped[int] = mapped_column(primary_key=True)
    player_id: Mapped[int] = mapped_column(ForeignKey("players.player_id"))
    coach_id: Mapped[int] = mapped_column(ForeignKey("coaches.coach_id"))
    feedback_date: Mapped[str] = mapped_column(String(40))
    comments: Mapped[str] = mapped_column(Text, default="")
    rating: Mapped[int] = mapped_column(Integer)  # overall, 1-5

    # Additive — the coach evaluation UI breaks the overall rating down
    # into four axes; `rating` above is their average, rounded.
    skill: Mapped[int] = mapped_column(Integer, default=3)
    effort: Mapped[int] = mapped_column(Integer, default=3)
    teamwork: Mapped[int] = mapped_column(Integer, default=3)
    attitude: Mapped[int] = mapped_column(Integer, default=3)


class Announcement(Base):
    """Additive — not in the ERD. Real authored messages (coach-to-team or
    admin program-wide/per-sport), distinct from the notification bell's
    derived reminders which aren't actual content anyone wrote."""

    __tablename__ = "announcements"

    announcement_id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("system_users.user_id"))
    # coach_id set => posted by that coach, visible only to their own roster.
    # coach_id null + sport set => admin, scoped to one sport.
    # coach_id null + sport null => admin, program-wide.
    coach_id: Mapped[int | None] = mapped_column(ForeignKey("coaches.coach_id"), nullable=True)
    sport: Mapped[str | None] = mapped_column(String(60), nullable=True)
    title: Mapped[str] = mapped_column(String(160))
    body: Mapped[str] = mapped_column(Text)
    posted_date: Mapped[str] = mapped_column(String(40))


class Season(Base):
    """Additive — not in the ERD. Seasons/terms aren't tracked as their own
    entity there, but reports need a real time boundary to scope against
    beyond fixed "last N days" presets; a season's date range is resolved
    on the fly rather than stamped onto every attendance/evaluation row."""

    __tablename__ = "seasons"

    season_id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    start_date: Mapped[str] = mapped_column(String(40))
    end_date: Mapped[str] = mapped_column(String(40))
    is_active: Mapped[bool] = mapped_column(default=False)


class ReportAnalytics(Base):
    __tablename__ = "reports_analytics"

    report_id: Mapped[int] = mapped_column(primary_key=True)
    report_type: Mapped[str] = mapped_column(String(20))  # Attendance | Performance | Training
    generated_by: Mapped[int] = mapped_column(ForeignKey("system_users.user_id"))
    generated_date: Mapped[str] = mapped_column(String(40))
    details: Mapped[str] = mapped_column(Text, default="")

    # Additive — lets the report list show a human title and filter by sport,
    # and mirrors the old Ready/Generating status shown in the UI.
    title: Mapped[str] = mapped_column(String(160), default="Untitled report")
    sport: Mapped[str | None] = mapped_column(String(60), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Ready")
    range: Mapped[str] = mapped_column(String(60), default="Custom")


class Statistic(Base):
    __tablename__ = "statistics"

    stats_id: Mapped[int] = mapped_column(primary_key=True)
    stats_type: Mapped[str] = mapped_column(String(60))  # Attendance Summary | Performance Average | Participation count | Training performance
    generated_by: Mapped[int] = mapped_column(ForeignKey("system_users.user_id"))
    description: Mapped[str] = mapped_column(Text, default="")
    data_payload: Mapped[str] = mapped_column(Text, default="")
    generated_date: Mapped[str] = mapped_column(String(40), default="")


class LoginHistory(Base):
    __tablename__ = "login_history"

    log_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("system_users.user_id"))
    login_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    logout_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    device_info: Mapped[str | None] = mapped_column(String(255), nullable=True)


class ArchivedRecord(Base):
    __tablename__ = "archived_records"

    archive_id: Mapped[int] = mapped_column(primary_key=True)
    record_type: Mapped[str] = mapped_column(String(20))  # Player | User
    record_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    archive_data: Mapped[str] = mapped_column(Text, default="")
    archived_at: Mapped[str] = mapped_column(String(40))
    archived_by: Mapped[int | None] = mapped_column(ForeignKey("system_users.user_id", ondelete="SET NULL"), nullable=True)
