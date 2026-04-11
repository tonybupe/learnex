from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class SessionAttendance(Base, TimestampMixin):
    __tablename__ = "session_attendance"
    __table_args__ = (
        UniqueConstraint("session_id", "user_id", name="uq_session_attendance_user"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("live_sessions.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    role_at_join: Mapped[str] = mapped_column(String(20), nullable=False)  # teacher|learner|admin
    attendance_status: Mapped[str] = mapped_column(String(20), nullable=False, default="joined")  # joined|left|completed
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    left_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(nullable=True)

    session = relationship("LiveSession", back_populates="attendances")
    user = relationship("User")