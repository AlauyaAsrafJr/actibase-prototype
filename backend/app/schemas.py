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

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---- admin ----


class AdminUserCreate(BaseModel):
    name: str
    email: EmailStr
    role: str = "Coach"  # Admin | Coach | Staff


class PlayerOut(UserOut):
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

    class Config:
        from_attributes = True


class ArchiveOut(BaseModel):
    id: int
    name: str
    type: str
    archived_on: str
    archived_by: str

    class Config:
        from_attributes = True


class BulkIds(BaseModel):
    ids: list[int]


class AdminDashboardOut(BaseModel):
    total_players: int
    total_coaches: int
    total_users_active: int
    total_sessions: int
    total_reports: int
    archived_records: int


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
    time: str
    type: str = "Practice"
    location: str = "Main Gym"


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
    activity_names: list[str] = []

    class Config:
        from_attributes = True


class ActivityCreate(BaseModel):
    name: str
    category: str
    duration: str
    difficulty: str = "Beginner"
    description: str = ""


class ActivityOut(BaseModel):
    id: int
    name: str
    category: str
    duration: str
    difficulty: str
    description: str
    assigned_session_ids: list[int] = []

    class Config:
        from_attributes = True


class AssignActivityRequest(BaseModel):
    session_id: int


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

    class Config:
        from_attributes = True


class RosterPlayerOut(BaseModel):
    id: int
    name: str
    year: str | None
    position: str | None
    attendance_pct: int
    last_eval: str

    class Config:
        from_attributes = True


class CoachDashboardOut(BaseModel):
    player_count: int
    todays_sessions: int
    attendance_rate: int
    pending_evaluations: int
    upcoming_training: int
    recent_feedback: int


# ---- player ----


class PlayerAttendanceOut(BaseModel):
    id: int
    date: str
    type: str
    location: str
    status: str

    class Config:
        from_attributes = True


class PlayerActivityOut(BaseModel):
    id: int
    name: str
    category: str
    duration: str
    difficulty: str
    description: str
    date: str

    class Config:
        from_attributes = True


class PlayerEvaluationOut(BaseModel):
    id: int
    date: str
    coach_name: str
    skill: int
    effort: int
    teamwork: int
    attitude: int
    comment: str

    class Config:
        from_attributes = True


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
