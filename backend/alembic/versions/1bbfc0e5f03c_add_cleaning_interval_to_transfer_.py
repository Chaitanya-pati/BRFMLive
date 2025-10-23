"""add_cleaning_interval_to_transfer_sessions

Revision ID: 1bbfc0e5f03c
Revises: 4d8313193e73
Create Date: 2025-10-23 17:10:08.528225

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1bbfc0e5f03c'
down_revision: Union[str, Sequence[str], None] = '4d8313193e73'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('transfer_sessions', sa.Column('cleaning_interval_hours', sa.Integer(), nullable=False, server_default='3'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('transfer_sessions', 'cleaning_interval_hours')
