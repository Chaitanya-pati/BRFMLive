
"""remove_location_from_godown

Revision ID: remove_location_from_godown
Revises: 0e2032d79a84
Create Date: 2025-01-10 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'remove_location_from_godown'
down_revision: Union[str, Sequence[str], None] = '0e2032d79a84'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove location column from godown_master table."""
    op.drop_column('godown_master', 'location')


def downgrade() -> None:
    """Add location column back to godown_master table."""
    op.add_column('godown_master', sa.Column('location', sa.String(length=255), nullable=True))
