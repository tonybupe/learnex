from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class Report(Base, TimestampMixin):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    reporter_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    target_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )  # post|message|user|media|comment

    target_id: Mapped[int] = mapped_column(nullable=False, index=True)

    reason_code: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )  # abuse|harassment|spam|nudity|violence|fake|copyright|other

    reason_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="open",
        index=True,
    )  # open|in_review|resolved|dismissed|escalated

    priority: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="normal",
        index=True,
    )  # low|normal|high|critical

    assigned_admin_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    resolved_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    reporter = relationship("User", foreign_keys=[reporter_id])
    assigned_admin = relationship("User", foreign_keys=[assigned_admin_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])