from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class LiveSession(Base, TimestampMixin):
    __tablename__ = "live_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    class_id: Mapped[int] = mapped_column(ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=False)
    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    lesson_id: Mapped[int | None] = mapped_column(ForeignKey("lessons.id", ondelete="SET NULL"), nullable=True)

    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    session_type: Mapped[str] = mapped_column(String(20), nullable=False, default="live", index=True)  # live|revision|discussion|oral
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="scheduled", index=True)  # scheduled|live|completed|cancelled
    meeting_provider: Mapped[str | None] = mapped_column(String(50), nullable=True)  # internal|jitsi|zoom|meet
    meeting_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    meeting_code: Mapped[str | None] = mapped_column(String(100), nullable=True)

    scheduled_start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    scheduled_end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    actual_start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    allow_replay: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    recording_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    classroom = relationship("ClassRoom")
    subject = relationship("Subject")
    teacher = relationship("User")
    lesson = relationship("Lesson")
