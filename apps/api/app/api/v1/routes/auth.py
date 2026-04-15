from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.user import UserResponse
from app.services.auth_service import login_user, register_user

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

# ── FORGOT PASSWORD ───────────────────────────────────────────────
@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Request a password reset token. Always returns success to prevent email enumeration."""
    import secrets
    from datetime import datetime, timedelta, timezone
    from app.models.user import User

    user = db.query(User).filter(User.email == payload.email).first()
    if user:
        token = secrets.token_hex(32)
        user.reset_token = token
        user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
        # In production: send email with reset link
        # For now: return token in response (dev mode only)
        import os
        if os.getenv("APP_ENV") == "development":
            return MessageResponse(message=f"DEV_TOKEN:{token}")

    return MessageResponse(message="If that email is registered, a reset link has been sent.")


# ── RESET PASSWORD ────────────────────────────────────────────────
@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using a valid token."""
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


# ── VERIFY RESET TOKEN ────────────────────────────────────────────
@router.get("/verify-reset-token/{token}", response_model=MessageResponse)
def verify_reset_token(token: str, db: Session = Depends(get_db)):
    """Check if a reset token is still valid."""
    from datetime import datetime, timezone
    from app.models.user import User

    user = db.query(User).filter(User.reset_token == token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid token")
    if user.reset_token_expires and user.reset_token_expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token has expired")

    return MessageResponse(message="Token is valid")