"""add_created_by_to_subjects
Revision ID: 96c2eafbd6e6
Revises: f2a8c1c423ff
Create Date: 2026-04-15 02:41:28.820376
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "96c2eafbd6e6"
down_revision: Union[str, None] = "f2a8c1c423ff"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column("subjects", sa.Column("created_by", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_subjects_created_by_users",
        "subjects", "users",
        ["created_by"], ["id"],
        ondelete="SET NULL"
    )
    op.create_index("ix_subjects_created_by", "subjects", ["created_by"])

def downgrade() -> None:
    op.drop_index("ix_subjects_created_by", table_name="subjects")
    op.drop_constraint("fk_subjects_created_by_users", "subjects", type_="foreignkey")
    op.drop_column("subjects", "created_by")
