"""Seed the database with data equivalent to the frontend's mock data
(js/data.js, js/coach-data.js, js/player-data.js), reconciled into one
coherent relational dataset now that Admin/Coach/Player are all rows in
the same `users` table.

Run with: python -m app.seed
"""

from sqlalchemy.orm import Session

from .config import TODAY_LABEL
from .database import Base, SessionLocal, engine
from .models import (
    ActivityAssignment,
    Activity,
    ArchiveRecord,
    AttendanceRecord,
    Evaluation,
    Report,
    TrainingSession,
    User,
)
from .security import hash_password

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


def make_user(db: Session, name: str, email: str, role: str, password: str, **extra) -> User:
    user = User(name=name, email=email, password_hash=hash_password(password), role=role, status="Active", last_active="Today", **extra)
    db.add(user)
    db.flush()
    return user


def seed(db: Session) -> None:
    if db.query(User).count() > 0:
        print("Database already has data — skipping seed. Delete actibase.db to reseed.")
        return

    # ---- admins & staff ----
    dana = make_user(db, "Dana Whitfield", "dana.whitfield@actibase.edu", "admin", DEMO_PASSWORD)
    make_user(db, "Theo Park", "theo.park@actibase.edu", "admin", DEFAULT_PASSWORD)
    make_user(db, "Nora Kim", "nora.kim@actibase.edu", "staff", DEFAULT_PASSWORD)
    make_user(db, "Ben Foster", "ben.foster@actibase.edu", "staff", DEFAULT_PASSWORD)
    make_user(db, "Ivy Sanders", "ivy.sanders@actibase.edu", "staff", DEFAULT_PASSWORD)
    leo = make_user(db, "Leo Martins", "leo.martins@actibase.edu", "staff", DEFAULT_PASSWORD)
    leo.status = "Inactive"

    # ---- Marcus Bailey (Basketball) — the fully-featured coach ----
    marcus = make_user(db, "Marcus Bailey", "marcus.bailey@actibase.edu", "coach", DEMO_PASSWORD,
                        sport="Basketball", phone="(555) 019-2231", years_coaching="6",
                        bio="Focused on building fundamentals, discipline and team chemistry every season.")

    players_by_email: dict[str, User] = {}
    for name, year, position, password in BASKETBALL_ROSTER:
        email = name.lower().replace(" ", ".") + "@actibase.edu"
        p = make_user(db, name, email, "player", password, sport="Basketball", position=position, year=year, coach_id=marcus.id)
        players_by_email[name] = p
    db.flush()

    # ---- other 7 coaches, each with a light 2-player roster ----
    for coach_name, sport, roster in OTHER_SPORTS_COACHES:
        coach_email = coach_name.lower().replace(" ", ".") + "@actibase.edu"
        coach = make_user(db, coach_name, coach_email, "coach", DEFAULT_PASSWORD, sport=sport,
                           phone="(555) 010-0000", years_coaching="4", bio=f"Building a competitive {sport} program.")
        for name, year, position in roster:
            email = name.lower().replace(" ", ".") + "@actibase.edu"
            make_user(db, name, email, "player", DEFAULT_PASSWORD, sport=sport, position=position, year=year, coach_id=coach.id)

        # generic 2-session history per sport so admin's program-wide session list has breadth
        for date, kind, rate in [("Jul 7, 2026", "Practice", 88), ("Jul 10, 2026", "Scrimmage", 92)]:
            total = 12
            present = round(total * rate / 100)
            db.add(TrainingSession(coach_id=coach.id, date=date, time="4:00 PM", type=kind, location="Home Field",
                                    sport=sport, status="Completed", present=present, absent=total - present, total=total, rate=rate))
    db.flush()

    # ---- Marcus's training sessions ----
    sessions_data = [
        ("s0", "Jul 14, 2026", "4:00 PM", "Practice", "Main Gym", "Scheduled", None),
        ("s1", "Jul 12, 2026", "4:00 PM", "Practice", "Main Gym", "Completed", (9, 1)),
        ("s2", "Jul 9, 2026", "6:00 PM", "Scrimmage", "Away — Central High", "Completed", (10, 0)),
        ("s3", "Jul 5, 2026", "4:00 PM", "Practice", "Main Gym", "Completed", (8, 2)),
        ("s4", "Jul 18, 2026", "4:00 PM", "Practice", "Main Gym", "Scheduled", None),
    ]
    session_rows: dict[str, TrainingSession] = {}
    roster_users = [players_by_email[n] for n, *_ in BASKETBALL_ROSTER]
    for key, date, time, kind, location, status, counts in sessions_data:
        total = len(roster_users)
        present = absent = rate = None
        if counts:
            present, absent = counts
            rate = round(present / total * 100)
        session = TrainingSession(coach_id=marcus.id, date=date, time=time, type=kind, location=location,
                                   sport="Basketball", status=status, present=present, absent=absent, total=total, rate=rate)
        db.add(session)
        db.flush()
        session_rows[key] = session

        if counts:
            absent_names = {
                "s1": {"Andre Vance"},
                "s2": set(),
                "s3": {"Kai Sutton", "Andre Vance"},
            }[key]
            for name, *_ in BASKETBALL_ROSTER:
                status_val = "absent" if name in absent_names else "present"
                db.add(AttendanceRecord(session_id=session.id, player_id=players_by_email[name].id, status=status_val))

    # ---- activities + assignments ----
    activities_data = [
        ("Full-Court Layup Ladder", "Ball Handling", "15 min", "Beginner",
         "Continuous layup drill building speed and control off the dribble.", ["s0"]),
        ("Catch-and-Shoot Circuit", "Shooting", "20 min", "Intermediate",
         "Five-spot perimeter shooting off the catch with passer rotation.", ["s0"]),
        ("Defensive Slide & Close-Out", "Defense", "12 min", "Intermediate",
         "Lateral slide footwork into closeout reps against a live shooter.", []),
        ("Suicides & Sprint Intervals", "Conditioning", "10 min", "Advanced",
         "Baseline sprint intervals to build fourth-quarter endurance.", ["s3"]),
        ("3-on-3 Read & React", "Team Play", "18 min", "Advanced",
         "Small-sided scrimmage emphasizing spacing and ball movement.", []),
        ("Two-Ball Dribbling Series", "Ball Handling", "10 min", "Intermediate",
         "Simultaneous two-ball combos to sharpen handle under pressure.", []),
        ("Free Throw Pressure Reps", "Shooting", "8 min", "Beginner",
         "Free throws under simulated fatigue and crowd-noise pressure.", ["s1"]),
        ("Box-Out & Rebound Battle", "Defense", "12 min", "Beginner",
         "Live box-out reps followed by a rebounding scramble drill.", []),
    ]
    for name, category, duration, difficulty, description, assigned in activities_data:
        activity = Activity(coach_id=marcus.id, name=name, category=category, duration=duration,
                             difficulty=difficulty, description=description)
        db.add(activity)
        db.flush()
        for session_key in assigned:
            db.add(ActivityAssignment(activity_id=activity.id, session_id=session_rows[session_key].id))

    # ---- evaluations (Tyler gets a fuller history to match the Player Module demo) ----
    evaluations_data = [
        ("Tyler Owens", "Jul 5, 2026", 4, 5, 4, 5, "Strong leadership on court."),
        ("Tyler Owens", "Jun 12, 2026", 4, 4, 4, 4, "Solid consistency, keep working on left-hand finishes."),
        ("Tyler Owens", "May 20, 2026", 3, 4, 4, 4, "Good energy in practice; needs sharper on-ball defense."),
        ("Jaden Brooks", "Jul 3, 2026", 3, 4, 4, 4, "Improving footwork, keep it up."),
        ("Marcus Hill", "Jul 2, 2026", 3, 3, 3, 4, "Needs more consistency in practice."),
        ("Devon Marsh", "Jul 1, 2026", 5, 4, 5, 4, "Excellent floor vision."),
    ]
    for player_name, date, skill, effort, teamwork, attitude, comment in evaluations_data:
        db.add(Evaluation(player_id=players_by_email[player_name].id, coach_id=marcus.id, date=date,
                           skill=skill, effort=effort, teamwork=teamwork, attitude=attitude, comment=comment))

    # ---- reports ----
    admin_reports = [
        ("Weekly Attendance Summary", "All sports", "Jul 6–12, 2026", "Jul 13, 2026", "Ready"),
        ("Basketball Engagement Report", "Basketball", "Jun 1–30, 2026", "Jul 2, 2026", "Ready"),
        ("Coach Evaluation — Term 2", "All sports", "This term", "Jul 10, 2026", "Ready"),
        ("Swimming Attendance Trend", "Swimming", "Last 30 days", "Jul 11, 2026", "Generating"),
        ("Player Performance Digest", "All sports", "This term", "Jul 9, 2026", "Ready"),
        ("Track & Field Session Log", "Track & Field", "Jul 1–13, 2026", "Jul 13, 2026", "Ready"),
        ("Inactive Players Watchlist", "All sports", "This term", "Jul 8, 2026", "Ready"),
        ("Soccer Attendance Trend", "Soccer", "Last 7 days", "Jul 12, 2026", "Generating"),
    ]
    for name, sport, range_, generated_on, status in admin_reports:
        db.add(Report(owner_role="admin", name=name, sport=sport, range=range_, generated_on=generated_on, status=status))

    coach_reports = [
        ("Weekly Attendance Summary — Basketball", "Jul 6–12, 2026", "Jul 13, 2026", "Ready"),
        ("Team Performance Report", "This term", "Jul 10, 2026", "Ready"),
        ("Player Evaluation Digest", "Last 30 days", "Jul 8, 2026", "Ready"),
    ]
    for name, range_, generated_on, status in coach_reports:
        db.add(Report(owner_role="coach", coach_id=marcus.id, name=name, sport="Basketball",
                       range=range_, generated_on=generated_on, status=status))

    # ---- archive (illustrative history, not tied to currently active rows) ----
    archive_data = [
        ("Owen Reyes", "Player", "Jun 20, 2026", "Dana Whitfield"),
        ("Casey Long (former Coach)", "User", "May 30, 2026", "Theo Park"),
        ("Term 1 Attendance — Baseball", "Session", "Apr 15, 2026", "Dana Whitfield"),
        ("Priya Fernandez", "Player", "Mar 2, 2026", "Dana Whitfield"),
        ("Term 1 Attendance — Swimming", "Session", "Apr 15, 2026", "Theo Park"),
        ("Marcus Boyd (former Staff)", "User", "Feb 18, 2026", "Dana Whitfield"),
        ("Term 1 Attendance — Tennis", "Session", "Apr 15, 2026", "Theo Park"),
        ("Ana Delgado", "Player", "Jan 22, 2026", "Dana Whitfield"),
        ("Winter Term Report Set", "Session", "Jan 10, 2026", "Theo Park"),
        ("Ravi Patel", "Player", "Dec 5, 2025", "Dana Whitfield"),
    ]
    for name, type_, archived_on, archived_by in archive_data:
        db.add(ArchiveRecord(name=name, type=type_, archived_on=archived_on, archived_by=archived_by))

    db.commit()
    print("Seeded database with demo data.")
    print(f"Demo login (any role, password '{DEMO_PASSWORD}'):")
    print(f"  Admin:  {dana.email}")
    print(f"  Coach:  {marcus.email}")
    print(f"  Player: {players_by_email['Tyler Owens'].email}")


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
