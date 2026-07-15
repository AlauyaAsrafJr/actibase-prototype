from flask import g
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, scoped_session, sessionmaker

from .config import DATABASE_URL

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))


class Base(DeclarativeBase):
    pass


def get_db():
    if "db" not in g:
        g.db = SessionLocal()
    return g.db


def _close_db(exception=None):
    g.pop("db", None)
    SessionLocal.remove()


def init_app(app):
    app.teardown_appcontext(_close_db)
