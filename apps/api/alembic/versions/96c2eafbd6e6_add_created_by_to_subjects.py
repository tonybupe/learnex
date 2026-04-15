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
    # Add created_by FK to subjects — column added manually via SQL on 2026-04-15
    # This migration is a no-op on existing DBs where the column was added directly,
    # but ensures fresh deployments get the column via alembic upgrade head.
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='subjects' AND column_name='created_by'
            ) THEN
                ALTER TABLE subjects
                    ADD COLUMN created_by INTEGER
                    REFERENCES users(id) ON DELETE SET NULL;
                CREATE INDEX ix_subjects_created_by ON subjects(created_by);
            END IF;
        END
        $$;
    """)


def downgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='subjects' AND column_name='created_by'
            ) THEN
                DROP INDEX IF EXISTS ix_subjects_created_by;
                ALTER TABLE subjects DROP COLUMN IF EXISTS created_by;
            END IF;
        END
        $$;
    """)
