from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class ModerationAction(Base, TimestampMixin):
    __tablename__ = "moderation_actions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    report_id: Mapped[int | None] = mapped_column(
        ForeignKey("reports.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    admin_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    target_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    target_id: Mapped[int] = mapped_column(nullable=False, index=True)

    action_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )  # warn|hide|disable|delete|restore|suspend_user|ban_user|dismiss_report

    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_reversible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    report = relationship("Report")
    admin = relationship("User")