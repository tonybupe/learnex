from sqlalchemy import String, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from app.models.base import TimestampMixin


class UserProfile(Base, TimestampMixin):
    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True, index=True, nullable=False,
    )

    # Identity / Display
    avatar_url: Mapped[str] = mapped_column(String(500), nullable=True)
    cover_url: Mapped[str] = mapped_column(String(500), nullable=True)
    bio: Mapped[str] = mapped_column(String(500), nullable=True)

    # Personal Info
    date_of_birth: Mapped[str] = mapped_column(String(20), nullable=True)
    location: Mapped[str] = mapped_column(String(150), nullable=True)
    country: Mapped[str] = mapped_column(String(100), nullable=True)

    # Professional Info
    profession: Mapped[str] = mapped_column(String(150), nullable=True)
    organization: Mapped[str] = mapped_column(String(150), nullable=True)
    website: Mapped[str] = mapped_column(String(200), nullable=True)

    # Flexible fields
    skills: Mapped[dict] = mapped_column(JSON, nullable=True)
    interests: Mapped[dict] = mapped_column(JSON, nullable=True)
    social_links: Mapped[dict] = mapped_column(JSON, nullable=True)

    # Relationship
    user = relationship("User", back_populates="profile")