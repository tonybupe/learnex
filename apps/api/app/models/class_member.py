from sqlalchemy import ForeignKey, UniqueConstraint, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class ClassMember(Base, TimestampMixin):
    __tablename__ = "class_members"

    __table_args__ = (
        UniqueConstraint("class_id", "learner_id", name="uq_class_learner"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    class_id: Mapped[int] = mapped_column(
        ForeignKey("classes.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    learner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="active"
    )  # active | left | blocked


    # ------------------------------
    # RELATIONSHIPS
    # ------------------------------

    classroom = relationship(
        "ClassRoom",
        back_populates="members"
    )

    learner = relationship(
        "User",
        back_populates="class_memberships"
    )