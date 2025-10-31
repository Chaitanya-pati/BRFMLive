
"""fix transfer_session_status enum values

Revision ID: fix_transfer_status_enum
Revises: merge_all_heads_final
Create Date: 2025-01-27 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fix_transfer_status_enum'
down_revision: Union[str, Sequence[str], None] = 'merge_all_heads_final'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the old enum type and create a new one with capitalized values
    op.execute("ALTER TYPE transfer_session_status RENAME TO transfer_session_status_old")
    op.execute("CREATE TYPE transfer_session_status AS ENUM ('Active', 'Completed', 'Cancelled')")
    op.execute("ALTER TABLE transfer_sessions ALTER COLUMN status TYPE transfer_session_status USING status::text::transfer_session_status")
    op.execute("DROP TYPE transfer_session_status_old")


def downgrade() -> None:
    # Revert to lowercase values
    op.execute("ALTER TYPE transfer_session_status RENAME TO transfer_session_status_old")
    op.execute("CREATE TYPE transfer_session_status AS ENUM ('active', 'completed', 'cancelled')")
    op.execute("ALTER TABLE transfer_sessions ALTER COLUMN status TYPE transfer_session_status USING status::text::transfer_session_status")
    op.execute("DROP TYPE transfer_session_status_old")
