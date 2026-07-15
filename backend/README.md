# Actibase API

A standalone Flask backend for the Actibase prototype. It implements real
auth (register/login/JWT) and CRUD endpoints for the Admin, Coach, and
Player modules, backed by PostgreSQL.

**This is not wired up to the frontend yet.** The existing `index.html` /
`admin.html` / `coach.html` / `player.html` pages still run entirely on
mock data in `js/*-data.js`. This API exists standalone so it can be
exercised via `curl` or a REST client and wired in later.

## Setup

1. Install and start PostgreSQL locally (or point `DATABASE_URL` at any
   Postgres instance you already have).
2. Create a database and role:

   ```bash
   sudo -u postgres psql -c "CREATE USER actibase WITH PASSWORD 'actibase';"
   sudo -u postgres psql -c "CREATE DATABASE actibase OWNER actibase;"
   ```

3. Install dependencies:

   ```bash
   cd backend
   python3 -m venv .venv
   .venv/bin/pip install -r requirements.txt
   ```

4. Copy `.env.example` to `.env` and adjust if your Postgres credentials
   differ from the defaults:

   ```bash
   cp .env.example .env
   ```

## Seed demo data

```bash
.venv/bin/python -m app.seed
```

Populates the database with a full set of admins, coaches, players,
sessions, activities, evaluations, reports, and archive records mirroring
the frontend's mock data. Safe to re-run — it no-ops if the database
already has users; truncate the tables first to reseed from scratch:

```bash
psql "$DATABASE_URL" -c "TRUNCATE users, training_sessions, activities, activity_assignments, attendance_records, evaluations, reports, archive_records RESTART IDENTITY CASCADE;"
```

Demo credentials (password `password123` for all three):

| Role   | Email                          |
|--------|---------------------------------|
| Admin  | dana.whitfield@actibase.edu     |
| Coach  | marcus.bailey@actibase.edu      |
| Player | tyler.owens@actibase.edu        |

All other seeded accounts use password `changeme`.

## Run

```bash
FLASK_APP=wsgi.py .venv/bin/flask run
```

Or directly:

```bash
.venv/bin/python wsgi.py
```

- API root: http://127.0.0.1:5000
- Health check: http://127.0.0.1:5000/health

There's no auto-generated docs page (that was a FastAPI feature) — see the
route list in **Structure** below, or the request examples in **Auth**.

## Auth

```bash
curl -X POST http://127.0.0.1:5000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"dana.whitfield@actibase.edu","password":"password123"}'
```

Returns a bearer token. Pass it on subsequent requests:

```bash
curl http://127.0.0.1:5000/admin/dashboard \
  -H "Authorization: Bearer <token>"
```

## Structure

```
wsgi.py             entry point — `app = create_app()`
app/
  __init__.py       create_app() factory: CORS, blueprint registration, table creation
  config.py         env-driven settings (JWT secret, DATABASE_URL), loads .env
  database.py       SQLAlchemy engine + scoped session, Flask app-context teardown
  models.py         ORM models (User, TrainingSession, Activity, ...)
  schemas.py        Pydantic request/response models (used standalone, not via FastAPI)
  security.py       password hashing + JWT helpers
  auth.py           _authenticate(), login_required, require_role() — Flask auth guards
  http.py           parse_body / dump / dump_list / json_response helpers
  errors.py         ApiError + JSON error handlers
  utils.py          attendance %, evaluation averages, etc.
  seed.py           demo data seed script
  blueprints/
    auth.py         register, login, me
    admin.py        users, players, sessions, reports, archive
    coach.py        roster, sessions, activities, attendance, evaluations, reports, profile
    player.py       dashboard, attendance, activities, evaluations, stats, profile
```

## Notes

- All login-capable roles (admin, coach, staff, player) live in one `users`
  table with a `role` column, matching how the frontend's Register page
  already treats them as one identity system.
- Role checks are enforced per-blueprint via `before_request` (e.g. every
  route under `/admin` requires `role == "admin"`), mirroring the old
  FastAPI router-level dependency.
- `JWT_SECRET` and `DATABASE_URL` are configurable via environment
  variables (see `.env.example`); sane local defaults are used otherwise.
- CORS is wide open (`origins: "*"`) since this is a prototype — tighten
  this before deploying anywhere real.
- Schema is plain SQLAlchemy with no Postgres-specific types, so it would
  also run against SQLite or MySQL with a `DATABASE_URL` change — Postgres
  was chosen for its stronger constraint/enum support as this moves toward
  production (see the Database Design doc for the full rationale).
