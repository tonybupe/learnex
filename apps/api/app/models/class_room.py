from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class ClassRoom(Base, TimestampMixin):
    __tablename__ = "classes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    class_code: Mapped[str] = mapped_column(String(40), unique=True, nullable=False, index=True)

    grade_level: Mapped[str | None] = mapped_column(String(30), nullable=True)
    visibility: Mapped[str] = mapped_column(String(20), nullable=False, default="public")  # public|private
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")  # active|archived

    teacher_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=False)

    teacher = relationship("User")
    subject = relationship("Subject", back_populates="classes")
    members = relationship("ClassMember", back_populates="classroom", cascade="all, delete-orphan")