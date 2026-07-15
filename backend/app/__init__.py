from flask import Flask, jsonify
from flask_cors import CORS

from . import models  # noqa: F401 — registers tables on Base.metadata
from .blueprints.admin import admin_bp
from .blueprints.auth import auth_bp
from .blueprints.coach import coach_bp
from .blueprints.player import player_bp
from .database import Base, engine
from .database import init_app as init_db
from .errors import register_error_handlers


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "*"}})  # demo-only; restrict before deploying anywhere real

    init_db(app)
    Base.metadata.create_all(bind=engine)
    register_error_handlers(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(coach_bp)
    app.register_blueprint(player_bp)

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    return app
