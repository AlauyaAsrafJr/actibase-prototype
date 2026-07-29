from pydantic import BaseModel, EmailStr, Field

# ---- auth ----


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: str  # admin | coach | player
    sport: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    """Account-level representation. id is always system_users.user_id —
    the one identifier shared across admin/coach accounts (see PlayerOut
    for why players get their own id space)."""

    id: int
    name: str
    email: str
    role: str
    status: str
    last_active: str
    sport: str | None = None
    position: str | None = None
    year: str | None = None
    phone: str | None = None
    bio: str | None = None
    years_coaching: str | None = None
    coach_id: int | None = None
    last_admin_action: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---- admin ----


class AdminUserCreate(BaseModel):
    name: str
    email: EmailStr
    role: str = "Coach"  # Admin | Coach
    sport: str | None = None  # only meaningful when role is Coach


class AdminUserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    sport: str | None = None  # only applied when the account is a Coach


class AdminPlayerCreate(BaseModel):
    first_name: str
    middle_name: str | None = None
    last_name: str
    email: EmailStr
    coach_id: int | None = None
    position: str | None = None
    year: str | None = None


class AdminPlayerUpdate(BaseModel):
    first_name: str | None = None
    middle_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    coach_id: int | None = None
    position: str | None = None
    year: str | None = None


class CoachOption(BaseModel):
    id: int
    name: str
    sport: str | None = None


class PlayerOut(BaseModel):
    """id is players.player_id — its own id space, distinct from UserOut.id,
    since player-scoped endpoints (roster, attendance, evaluations) all key
    off the Player table's own primary key."""

    id: int
    user_id: int
    name: str
    first_name: str
    middle_name: str | None = None
    last_name: str
    email: str
    role: str = "player"
    status: str
    last_active: str
    sport: str | None = None
    position: str | None = None
    year: str | None = None
    phone: str | None = None
    bio: str | None = None
    coach_id: int | None = None
    attendance_pct: int
    last_eval: str
    coach_name: str | None = None


class ReportCreate(BaseModel):
    name: str
    sport: str | None = None


class ReportOut(BaseModel):
    id: int
    name: str
    sport: str | None
    range: str
    generated_on: str
    status: str
    details: str


class ArchiveOut(BaseModel):
    id: int
    name: str
    type: str
    archived_on: str
    archived_by: str


class BulkIds(BaseModel):
    ids: list[int]


class AdminDashboardOut(BaseModel):
    total_players: int
    total_coaches: int
    total_users_active: int
    total_sessions: int
    total_reports: int
    archived_records: int


class ResetPasswordOut(BaseModel):
    reset: bool
    new_password: str


class LoginHistoryOut(BaseModel):
    id: int
    user_name: str
    role: str
    login_time: str
    logout_time: str | None
    ip_address: str | None
    device_info: str | None


class StatisticCreate(BaseModel):
    stats_type: str
    description: str | None = None


class StatisticOut(BaseModel):
    id: int
    stats_type: str
    description: str
    data_payload: str
    generated_date: str
    generated_by_name: str


# ---- coach ----


class ProfileUpdate(BaseModel):
    name: str | None = None
    sport: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    bio: str | None = None
    years_coaching: str | None = None
    position: str | None = None
    year: str | None = None


class SessionCreate(BaseModel):
    date: str
    time: str = ""
    type: str = "Practice"
    location: str = "Main Gym"


class SessionUpdate(BaseModel):
    date: str | None = None
    time: str | None = None
    type: str | None = None
    location: str | None = None


class SessionOut(BaseModel):
    id: int
    date: str
    time: str
    type: str
    location: str
    sport: str | None
    status: str
    present: int | None
    absent: int | None
    total: int | None
    rate: int | None


class AttendanceMarkRequest(BaseModel):
    player_id: int
    status: str  # present | late | absent


class EvaluationCreate(BaseModel):
    player_id: int
    skill: int = Field(ge=1, le=5)
    effort: int = Field(ge=1, le=5)
    teamwork: int = Field(ge=1, le=5)
    attitude: int = Field(ge=1, le=5)
    comment: str = ""


class EvaluationOut(BaseModel):
    id: int
    player_id: int
    player_name: str
    date: str
    skill: int
    effort: int
    teamwork: int
    attitude: int
    comment: str


class RosterPlayerOut(BaseModel):
    id: int
    name: str
    year: str | None
    position: str | None
    attendance_pct: int
    last_eval: str


class CoachDashboardOut(BaseModel):
    player_count: int
    todays_sessions: int
    attendance_rate: int
    pending_evaluations: int
    upcoming_training: int
    recent_feedback: int


# ---- player ----


class PlayerActivityOut(BaseModel):
    id: int
    name: str
    date: str
    duration: str | None = None
    notes: str | None = None
    participation_status: str


class PlayerAttendanceOut(BaseModel):
    id: int
    date: str
    type: str
    location: str
    status: str


class PlayerEvaluationOut(BaseModel):
    id: int
    date: str
    coach_name: str
    skill: int
    effort: int
    teamwork: int
    attitude: int
    comment: str


class TeammateOut(BaseModel):
    name: str
    attendance_pct: int


class PlayerStatsOut(BaseModel):
    attendance_rate: int
    sessions_attended: int
    avg_evaluation: float
    team_rank: int
    team_size: int
    teammates: list[TeammateOut]


class PlayerDashboardOut(BaseModel):
    attendance_rate: int
    sessions_attended: int
    upcoming_sessions: int
    latest_evaluation_avg: float | None
    activities_completed: int
    overall_rank: int
    team_size: int
