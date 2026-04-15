from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserResponse
from app.services.auth_service import login_user, register_user
from pydantic import BaseModel, EmailStr
from typing import Optional

class LookupRequest(BaseModel):
    identifier: str

class LookupResponse(BaseModel):
    found: bool
    masked_email: Optional[str] = None
    masked_phone: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    identifier: str
    method: str  # "email" | "phone"

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class MessageResponse(BaseModel):
    message: str

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    try:
        user = register_user(db, payload)
        return user
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    try:
        token = login_user(db, payload)
        return TokenResponse(access_token=token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))


# ── LOOKUP ACCOUNT ────────────────────────────────────────────────
@router.post("/lookup-account", response_model=LookupResponse)
def lookup_account(payload: LookupRequest, db: Session = Depends(get_db)):
    """Look up account by email or phone and return masked contact info."""
    from app.models.user import User

    identifier = payload.identifier.strip()
    user = None

    if "@" in identifier:
        user = db.query(User).filter(User.email == identifier).first()
    else:
        user = db.query(User).filter(User.phone_number == identifier).first()
        if not user and not identifier.startswith("+"):
            user = db.query(User).filter(User.phone_number == "+" + identifier).first()

    if not user:
        return LookupResponse(found=False)

    def mask_email(email: str) -> str:
        local, domain = email.split("@", 1)
        if len(local) <= 2:
            return local[0] + "***@" + domain
        stars = "*" * (len(local) - 2)
        return local[0] + stars + local[-1] + "@" + domain

    def mask_phone(phone: str) -> str:
        if len(phone) <= 6:
            return "****"
        visible_start = phone[:3]
        visible_end = phone[-3:]
        stars = "*" * (len(phone) - 6)
        return visible_start + stars + visible_end

    return LookupResponse(
        found=True,
        masked_email=mask_email(user.email),
        masked_phone=mask_phone(user.phone_number),
    )


# ── FORGOT PASSWORD ───────────────────────────────────────────────
@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request a password reset token via email or phone."""
    import secrets
    import os
    from datetime import datetime, timedelta, timezone
    from app.models.user import User

    identifier = payload.identifier.strip()

    if "@" in identifier:
        user = db.query(User).filter(User.email == identifier).first()
    else:
        user = db.query(User).filter(User.phone_number == identifier).first()
        if not user and not identifier.startswith("+"):
            user = db.query(User).filter(User.phone_number == "+" + identifier).first()

    if user:
        token = secrets.token_hex(32)
        user.reset_token = token
        user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
        if os.getenv("APP_ENV") == "development":
            return MessageResponse(message="DEV_TOKEN:" + token)

    return MessageResponse(message="Reset instructions sent.")


# ── VERIFY TOKEN ──────────────────────────────────────────────────
@router.get("/verify-reset-token/{token}", response_model=MessageResponse)
def verify_reset_token(token: str, db: Session = Depends(get_db)):
    from datetime import datetime, timezone
    from app.models.user import User
    user = db.query(User).filter(User.reset_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid token")
    if user.reset_token_expires and user.reset_token_expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token has expired")
    return MessageResponse(message="Token is valid")


# ── RESET PASSWORD ────────────────────────────────────────────────
@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    from datetime import datetime, timezone
    from app.models.user import User
    from app.core.security import hash_password

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user = db.query(User).filter(User.reset_token == payload.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if user.reset_token_expires and user.reset_token_expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token has expired")

    user.password_hash = hash_password(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    return MessageResponse(message="Password reset successfully. You can now log in.")