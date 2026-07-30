"""Seed the database to match the approved ERD (Figure 3.2.4) — System
User + Player/Coach/Admin profile tables, Training Activities,
Participation, Attendance, Performance Feedback, Reports/Analytics,
Statistics, Login History, and Archived Records.

Run with: python -m app.seed
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from .config import TODAY_LABEL
from .database import Base, SessionLocal, engine
from .models import (
    Admin,
    ArchivedRecord,
    Attendance,
    Coach,
    LoginHistory,
    Participation,
    Player,
    PerformanceFeedback,
    ReportAnalytics,
    Season,
    Statistic,
    SystemUser,
    TrainingActivity,
)
from .security import hash_password
from .utils import report_summary

DEMO_PASSWORD = "password123"
DEFAULT_PASSWORD = "changeme"

OTHER_SPORTS_COACHES = [
    ("Elena Cruz", "Volleyball", [("Sophia Diaz", "Sophomore", "Outside Hitter"), ("Riley Chen", "Junior", "Setter")]),
    ("Devon Ortiz", "Track & Field", [("Aisha Bello", "Junior", "Sprinter"), ("Noah Kim", "Senior", "Distance")]),
    ("Priya Nandan", "Swimming", [("Lily Zhang", "Sophomore", "Freestyle"), ("Gavin Moss", "Freshman", "Butterfly")]),
    ("Sam Whitfield", "Soccer", [("Diego Fuentes", "Senior", "Forward"), ("Mia Alvarez", "Junior", "Midfielder")]),
    ("Jordan Reyes", "Baseball", [("Caleb Turner", "Senior", "Pitcher"), ("Wyatt James", "Sophomore", "Catcher")]),
    ("Alicia Chen", "Softball", [("Zoe Franklin", "Junior", "Shortstop"), ("Ruby Sinclair", "Freshman", "Pitcher")]),
    ("Marcus Lowe", "Tennis", [("Nathan Voss", "Senior", "Singles"), ("Ivy Coleman", "Junior", "Doubles")]),
]

BASKETBALL_ROSTER = [
    ("Tyler Owens", "Senior", "Guard", DEMO_PASSWORD),
    ("Jaden Brooks", "Junior", "Forward", DEFAULT_PASSWORD),
    ("Marcus Hill", "Sophomore", "Center", DEFAULT_PASSWORD),
    ("Devon Marsh", "Senior", "Guard", DEFAULT_PASSWORD),
    ("Kai Sutton", "Junior", "Forward", DEFAULT_PASSWORD),
    ("Reggie Cole", "Freshman", "Guard", DEFAULT_PASSWORD),
    ("Andre Vance", "Senior", "Center", DEFAULT_PASSWORD),
    ("Miles Ford", "Junior", "Guard", DEFAULT_PASSWORD),
    ("Trey Nolan", "Sophomore", "Forward", DEFAULT_PASSWORD),
    ("Isaiah Grant", "Freshman", "Guard", DEFAULT_PASSWORD),
]


def _split(name: str) -> tuple[str, str]:
    parts = name.strip().split(" ", 1)
    return (parts[0], parts[1] if len(parts) > 1 else "")


def make_admin(db: Session, name: str, email: str, password: str) -> tuple[SystemUser, Admin]:
    su = SystemUser(username=email, password=hash_password(password), role="admin", status="Active", last_login="Today")
    db.add(su)
    db.flush()
    first, last = _split(name)
    admin = Admin(user_id=su.user_id, first_name=first, last_name=last, email=email)
    db.add(admin)
    db.flush()
    return su, admin


def make_coach(db: Session, name: str, email: str, password: str, **extra) -> tuple[SystemUser, Coach]:
    su = SystemUser(username=email, password=hash_password(password), role="coach", status="Active", last_login="Today")
    db.add(su)
    db.flush()
    first, last = _split(name)
    coach = Coach(user_id=su.user_id, first_name=first, last_name=last, email=email, **extra)
    db.add(coach)
    db.flush()
    return su, coach


def make_player(db: Session, name: str, email: str, password: str, coach: Coach, **extra) -> tuple[SystemUser, Player]:
    su = SystemUser(username=email, password=hash_password(password), role="player", status="Active", last_login="Today")
    db.add(su)
    db.flush()
    first, last = _split(name)
    player = Player(user_id=su.user_id, first_name=first, last_name=last, email=email, coach_id=coach.coach_id, **extra)
    db.add(player)
    db.flush()
    return su, player


def seed(db: Session) -> None:
    if db.query(SystemUser).count() > 0:
        print("Database already has data — skipping seed. Truncate the tables to reseed.")
        return

    # ---- admins ----
    dana_su, dana = make_admin(db, "Dana Whitfield", "dana.whitfield@actibase.edu", DEMO_PASSWORD)
    make_admin(db, "Theo Park", "theo.park@actibase.edu", DEFAULT_PASSWORD)
    make_admin(db, "Nora Kim", "nora.kim@actibase.edu", DEFAULT_PASSWORD)
    make_admin(db, "Ben Foster", "ben.foster@actibase.edu", DEFAULT_PASSWORD)
    make_admin(db, "Ivy Sanders", "ivy.sanders@actibase.edu", DEFAULT_PASSWORD)
    leo_su, _leo = make_admin(db, "Leo Martins", "leo.martins@actibase.edu", DEFAULT_PASSWORD)
    leo_su.status = "Inactive"

    # ---- Marcus Bailey (Basketball) — the fully-featured coach ----
    marcus_su, marcus = make_coach(
        db, "Marcus Bailey", "marcus.bailey@actibase.edu", DEMO_PASSWORD,
        specialization="Basketball", contact_number="(555) 019-2231", years_coaching="6",
        bio="Focused on building fundamentals, discipline and team chemistry every season.",
    )

    players_by_name: dict[str, Player] = {}
    for name, year, position, password in BASKETBALL_ROSTER:
        email = name.lower().replace(" ", ".") + "@actibase.edu"
        _su, p = make_player(db, name, email, password, marcus, position=position, year=year)
        players_by_name[name] = p
    db.flush()

    # ---- other 7 coaches, each with a light 2-player roster ----
    other_coaches: dict[str, Coach] = {}
    for coach_name, sport, roster in OTHER_SPORTS_COACHES:
        coach_email = coach_name.lower().replace(" ", ".") + "@actibase.edu"
        _csu, coach = make_coach(
            db, coach_name, coach_email, DEFAULT_PASSWORD, specialization=sport,
            contact_number="(555) 010-0000", years_coaching="4", bio=f"Building a competitive {sport} program.",
        )
        other_coaches[sport] = coach
        for name, year, position in roster:
            email = name.lower().replace(" ", ".") + "@actibase.edu"
            make_player(db, name, email, DEFAULT_PASSWORD, coach, position=position, year=year)

        # generic 2-activity history per sport so admin's program-wide list has breadth
        for date, kind in [("Jul 7, 2026", "Practice"), ("Jul 10, 2026", "Scrimmage")]:
            db.add(TrainingActivity(coach_id=coach.coach_id, activity_name=kind, activity_date=date, time="4:00 PM", location="Home Field", status="Completed"))
    db.flush()

    # ---- Marcus's training activities ----
    activities_data = [
        ("s0", "Jul 14, 2026", "4:00 PM", "Practice", "Main Gym", "Scheduled", None, "Catch-and-shoot circuit plus full-court layup ladder."),
        ("s1", "Jul 12, 2026", "4:00 PM", "Practice", "Main Gym", "Completed", (9, 1), "Free throw pressure reps under simulated fatigue."),
        ("s2", "Jul 9, 2026", "6:00 PM", "Scrimmage", "Away — Central High", "Completed", (10, 0), "Live scrimmage against Central High."),
        ("s3", "Jul 5, 2026", "4:00 PM", "Practice", "Main Gym", "Completed", (8, 2), "Suicides and sprint intervals for fourth-quarter conditioning."),
        ("s4", "Jul 18, 2026", "4:00 PM", "Practice", "Main Gym", "Scheduled", None, "Defensive slide and close-out footwork."),
    ]
    activity_rows: dict[str, TrainingActivity] = {}
    roster_players = [players_by_name[n] for n, *_ in BASKETBALL_ROSTER]
    for key, date, time, kind, location, status, counts, notes in activities_data:
        activity = TrainingActivity(coach_id=marcus.coach_id, activity_name=kind, activity_date=date, time=time, location=location, duration="90 min", notes=notes, status=status)
        db.add(activity)
        db.flush()
        activity_rows[key] = activity

        if counts:
            absent_names = {
                "s1": {"Andre Vance"},
                "s2": set(),
                "s3": {"Kai Sutton", "Andre Vance"},
            }[key]
            for name, *_ in BASKETBALL_ROSTER:
                status_val = "absent" if name in absent_names else "present"
                player = players_by_name[name]
                db.add(Attendance(player_id=player.player_id, coach_id=marcus.coach_id, date=date, status=status_val))
                db.add(Participation(player_id=player.player_id, activity_id=activity.activity_id, participation_status="Absent" if status_val == "absent" else "Completed"))
    db.flush()

    # ---- performance feedback (Tyler gets a fuller history) ----
    feedback_data = [
        ("Tyler Owens", "Jul 5, 2026", 4, 5, 4, 5, "Strong leadership on court."),
        ("Tyler Owens", "Jun 12, 2026", 4, 4, 4, 4, "Solid consistency, keep working on left-hand finishes."),
        ("Tyler Owens", "May 20, 2026", 3, 4, 4, 4, "Good energy in practice; needs sharper on-ball defense."),
        ("Jaden Brooks", "Jul 3, 2026", 3, 4, 4, 4, "Improving footwork, keep it up."),
        ("Marcus Hill", "Jul 2, 2026", 3, 3, 3, 4, "Needs more consistency in practice."),
        ("Devon Marsh", "Jul 1, 2026", 5, 4, 5, 4, "Excellent floor vision."),
    ]
    for player_name, date, skill, effort, teamwork, attitude, comment in feedback_data:
        player = players_by_name[player_name]
        overall = round((skill + effort + teamwork + attitude) / 4)
        db.add(PerformanceFeedback(
            player_id=player.player_id, coach_id=marcus.coach_id, feedback_date=date,
            skill=skill, effort=effort, teamwork=teamwork, attitude=attitude, rating=overall, comments=comment,
        ))

    # ---- reports/analytics ----
    # status is always "Ready" — generation is synchronous, so there's no real
    # in-progress state to model. details is real, computed content (same
    # helper the live "Generate report" action uses), not placeholder text.
    admin_reports = [
        ("Weekly Attendance Summary", "All sports", "Jul 6–12, 2026", "Jul 13, 2026"),
        ("Basketball Engagement Report", "Basketball", "Jun 1–30, 2026", "Jul 2, 2026"),
        ("Coach Evaluation — Term 2", "All sports", "This term", "Jul 10, 2026"),
        ("Swimming Attendance Trend", "Swimming", "Last 30 days", "Jul 11, 2026"),
        ("Player Performance Digest", "All sports", "This term", "Jul 9, 2026"),
        ("Track & Field Session Log", "Track & Field", "Jul 1–13, 2026", "Jul 13, 2026"),
        ("Inactive Players Watchlist", "All sports", "This term", "Jul 8, 2026"),
        ("Soccer Attendance Trend", "Soccer", "Last 7 days", "Jul 12, 2026"),
    ]
    for title, sport, range_, generated_on in admin_reports:
        db.add(ReportAnalytics(
            report_type="Training", generated_by=dana_su.user_id, generated_date=generated_on,
            title=title, sport=sport, range=range_, status="Ready", details=report_summary(db, sport),
        ))

    coach_reports = [
        ("Weekly Attendance Summary — Basketball", "Jul 6–12, 2026", "Jul 13, 2026"),
        ("Team Performance Report", "This term", "Jul 10, 2026"),
        ("Player Evaluation Digest", "Last 30 days", "Jul 8, 2026"),
    ]
    for title, range_, generated_on in coach_reports:
        db.add(ReportAnalytics(
            report_type="Training", generated_by=marcus_su.user_id, generated_date=generated_on,
            title=title, sport="Basketball", range=range_, status="Ready", details=report_summary(db, "Basketball"),
        ))

    # ---- statistics ----
    db.add(Statistic(stats_type="Attendance Summary", generated_by=dana_su.user_id, description="Program-wide attendance check", data_payload="91.2% average attendance across 24 players", generated_date="Jul 13, 2026"))
    db.add(Statistic(stats_type="Performance Average", generated_by=marcus_su.user_id, description="Basketball roster performance check", data_payload="4.0/5 average performance rating across 6 evaluations", generated_date="Jul 10, 2026"))

    # ---- login history ----
    now = datetime.now(timezone.utc)
    db.add(LoginHistory(user_id=dana_su.user_id, login_time=now - timedelta(hours=2), logout_time=now - timedelta(hours=1), ip_address="10.0.0.5", device_info="Chrome on Windows"))
    db.add(LoginHistory(user_id=marcus_su.user_id, login_time=now - timedelta(hours=5), logout_time=now - timedelta(hours=4, minutes=10), ip_address="10.0.0.12", device_info="Safari on macOS"))
    db.add(LoginHistory(user_id=players_by_name["Tyler Owens"].user_id, login_time=now - timedelta(minutes=40), ip_address="10.0.0.44", device_info="Chrome on Android"))

    # ---- archive (illustrative history, not tied to currently active rows) ----
    archive_data = [
        ("Owen Reyes", "Player", "Jun 20, 2026", dana_su.user_id),
        ("Casey Long (former Coach)", "User", "May 30, 2026", None),
        ("Priya Fernandez", "Player", "Mar 2, 2026", dana_su.user_id),
        ("Marcus Boyd (former Admin)", "User", "Feb 18, 2026", dana_su.user_id),
        ("Ana Delgado", "Player", "Jan 22, 2026", dana_su.user_id),
        ("Ravi Patel", "Player", "Dec 5, 2025", dana_su.user_id),
    ]
    for name, type_, archived_on, archived_by in archive_data:
        db.add(ArchivedRecord(record_type=type_, record_id=None, archive_data=name, archived_at=archived_on, archived_by=archived_by))

    # ---- seasons ----
    db.add(Season(name="AY 2025-2026, 2nd Semester", start_date="Jan 5, 2026", end_date="May 30, 2026", is_active=False))
    db.add(Season(name="AY 2026-2027, Summer Term", start_date="Jun 1, 2026", end_date="Aug 31, 2026", is_active=True))

    db.commit()
    tyler = players_by_name["Tyler Owens"]
    print("Seeded database with demo data.")
    print(f"Demo login (any role, password '{DEMO_PASSWORD}'):")
    print(f"  Admin:  {dana.email}")
    print(f"  Coach:  {marcus.email}")
    print(f"  Player: {tyler.email}")


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
