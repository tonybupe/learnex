from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class SessionAttendance(Base, TimestampMixin):
    __tablename__ = "session_attendances"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    live_session_id: Mapped[int] = mapped_column(ForeignKey("live_sessions.id", ondelete="CASCADE"))
    learner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    status: Mapped[str] = mapped_column(String(20), default="present")
    joined_at: Mapped[str] = mapped_column(String(50), nullable=True)
    left_at: Mapped[str] = mapped_column(String(50), nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0)