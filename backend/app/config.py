import os

# Demo-only secret. Override with a real secret via the JWT_SECRET env
# var before deploying this anywhere beyond a local prototype.
JWT_SECRET = os.environ.get("JWT_SECRET", "actibase-dev-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24  # 24 hours

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./actibase.db")

# The frontend mock data hardcodes "today" as this date throughout; kept
# here so seeded data and "today's sessions" style queries line up with it.
TODAY_LABEL = "Jul 14, 2026"
