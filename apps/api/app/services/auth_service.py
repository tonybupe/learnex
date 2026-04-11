from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest


def register_user(db: Session, payload: RegisterRequest) -> User:
    existing_email = db.query(User).filter(User.email == payload.email).first()
    if existing_email:
        raise ValueError("Email already registered")

    existing_phone = db.query(User).filter(User.phone_number == payload.phone_number).first()
    if existing_phone:
        raise ValueError("Phone number already registered")

    user = User(
        full_name=payload.full_name,
        email=payload.email,
        phone_number=payload.phone_number,
        sex=payload.sex,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=True,
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login_user(db: Session, payload: LoginRequest) -> str:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise ValueError("Invalid credentials")

    if not verify_password(payload.password, user.password_hash):
        raise ValueError("Invalid credentials")

    if not user.is_active:
        raise ValueError("User account is inactive")

    return create_access_token(str(user.id))