# Actibase API

A standalone FastAPI backend for the Actibase prototype. It implements real
auth (register/login/JWT) and CRUD endpoints for the Admin, Coach, and
Player modules, backed by SQLite.

**This is not wired up to the frontend yet.** The existing `index.html` /
`admin.html` / `coach.html` / `player.html` pages still run entirely on
mock data in `js/*-data.js`. This API exists standalone so it can be
exercised via `/docs` or `curl` and wired in later.

## Setup

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## Seed demo data

```bash
.venv/bin/python -m app.seed
```

Creates `actibase.db` (SQLite) with a full set of admins, coaches, players,
sessions, activities, evaluations, reports, and archive records mirroring
the frontend's mock data. Safe to re-run — it no-ops if the database
already has users; delete `actibase.db` first to reseed from scratch.

Demo credentials (password `password123` for all three):

| Role   | Email                          |
|--------|---------------------------------|
| Admin  | dana.whitfield@actibase.edu     |
| Coach  | marcus.bailey@actibase.edu      |
| Player | tyler.owens@actibase.edu        |

All other seeded accounts use password `changeme`.

## Run

```bash
.venv/bin/uvicorn app.main:app --reload
```

- API root: http://127.0.0.1:8000
- Interactive docs (Swagger UI): http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health

## Auth

```bash
curl -X POST http://127.0.0.1:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"dana.whitfield@actibase.edu","password":"password123"}'
```

Returns a bearer token. Pass it on subsequent requests:

```bash
curl http://127.0.0.1:8000/admin/dashboard \
  -H "Authorization: Bearer <token>"
```

## Structure

```
app/
  main.py         FastAPI app, CORS, router registration
  config.py       env-driven settings (JWT secret, DB URL)
  database.py     SQLAlchemy engine/session
  models.py       ORM models (User, TrainingSession, Activity, ...)
  schemas.py      Pydantic request/response models
  security.py     password hashing + JWT helpers
  deps.py         get_current_user / require_role dependencies
  utils.py        attendance %, evaluation averages, etc.
  seed.py         demo data seed script
  routers/
    auth.py       register, login, me
    admin.py      users, players, sessions, reports, archive
    coach.py      roster, sessions, activities, attendance, evaluations, reports, profile
    player.py     dashboard, attendance, activities, evaluations, stats, profile
```

## Notes

- All login-capable roles (admin, coach, staff, player) live in one `users`
  table with a `role` column, matching how the frontend's Register page
  already treats them as one identity system.
- `JWT_SECRET` and `DATABASE_URL` are configurable via environment
  variables; sane defaults are used for local development.
- CORS is wide open (`allow_origins=["*"]`) since this is a prototype —
  tighten this before deploying anywhere real.
