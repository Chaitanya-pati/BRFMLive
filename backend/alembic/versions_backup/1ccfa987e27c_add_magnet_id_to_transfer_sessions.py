
"""add_magnet_id_to_transfer_sessions

Revision ID: 1ccfa987e27c
Revises: 1bbfc0e5f03c
Create Date: 2025-10-24 11:17:51.067271

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1ccfa987e27c'
down_revision: Union[str, Sequence[str], None] = '1bbfc0e5f03c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add magnet_id column to transfer_sessions table."""
    op.add_column('transfer_sessions', sa.Column('magnet_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_transfer_sessions_magnet', 'transfer_sessions', 'magnets', ['magnet_id'], ['id'])


def downgrade() -> None:
    """Remove magnet_id column from transfer_sessions table."""
    op.drop_constraint('fk_transfer_sessions_magnet', 'transfer_sessions', type_='foreignkey')
    op.drop_column('transfer_sessions', 'magnet_id')
