from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models
from .database import Base, engine
from .routers import admin, auth, coach, player

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Actibase API",
    description="Backend for the Actibase Admin/Coach/Player prototype (users, rosters, sessions, activities, evaluations, reports, archive).",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # demo-only; restrict this before deploying anywhere real
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(coach.router)
app.include_router(player.router)


@app.get("/health")
def health():
    return {"status": "ok"}
