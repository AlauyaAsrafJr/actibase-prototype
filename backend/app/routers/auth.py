from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

ALLOWED_REGISTER_ROLES = {"admin", "coach", "player"}


@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    role = payload.role.lower()
    if role not in ALLOWED_REGISTER_ROLES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "role must be admin, coach, or player")
    if role in ("coach", "player") and not (payload.sport and payload.sport.strip()):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "sport is required for coach and player accounts")

    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")

    user = models.User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=role,
        sport=payload.sport,
        status="Active",
        last_active="Just now",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    if user.status == "Archived":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been archived")
    user.last_active = "Today"
    db.commit()
    token = create_access_token(user.id)
    return schemas.TokenResponse(access_token=token, user=user)


@router.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(get_current_user)):
    return user
