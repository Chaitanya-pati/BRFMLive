
"""fix_enum_values

Revision ID: fix_enum_values
Revises: 3533733991b8
Create Date: 2025-01-27 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fix_enum_values'
down_revision: Union[str, Sequence[str], None] = '3533733991b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Fix enum values from 'Active' to 'ACTIVE' format."""
    # Update bins table
    op.execute("UPDATE bins SET status = 'ACTIVE' WHERE status = 'Active'")
    op.execute("UPDATE bins SET status = 'INACTIVE' WHERE status = 'Inactive'")
    op.execute("UPDATE bins SET status = 'MAINTENANCE' WHERE status = 'Maintenance'")
    op.execute("UPDATE bins SET status = 'FULL' WHERE status = 'Full'")
    
    # Update magnets table
    op.execute("UPDATE magnets SET status = 'ACTIVE' WHERE status = 'Active'")
    op.execute("UPDATE magnets SET status = 'INACTIVE' WHERE status = 'Inactive'")
    op.execute("UPDATE magnets SET status = 'MAINTENANCE' WHERE status = 'Maintenance'")
    op.execute("UPDATE magnets SET status = 'FULL' WHERE status = 'Full'")


def downgrade() -> None:
    """Revert enum values back to 'Active' format."""
    # Revert bins table
    op.execute("UPDATE bins SET status = 'Active' WHERE status = 'ACTIVE'")
    op.execute("UPDATE bins SET status = 'Inactive' WHERE status = 'INACTIVE'")
    op.execute("UPDATE bins SET status = 'Maintenance' WHERE status = 'MAINTENANCE'")
    op.execute("UPDATE bins SET status = 'Full' WHERE status = 'FULL'")
    
    # Revert magnets table
    op.execute("UPDATE magnets SET status = 'Active' WHERE status = 'ACTIVE'")
    op.execute("UPDATE magnets SET status = 'Inactive' WHERE status = 'INACTIVE'")
    op.execute("UPDATE magnets SET status = 'Maintenance' WHERE status = 'MAINTENANCE'")
    op.execute("UPDATE magnets SET status = 'Full' WHERE status = 'FULL'")
