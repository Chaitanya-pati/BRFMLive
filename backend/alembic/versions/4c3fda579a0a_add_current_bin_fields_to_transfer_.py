"""add_current_bin_fields_to_transfer_sessions

Revision ID: 4c3fda579a0a
Revises: add_bin_type_001
Create Date: 2025-11-18 07:48:10.518939

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4c3fda579a0a'
down_revision: Union[str, Sequence[str], None] = 'add_bin_type_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add current_bin_id and current_bin_start_timestamp columns to transfer_sessions."""
    # Add current_bin_id column
    op.add_column('transfer_sessions', sa.Column('current_bin_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_transfer_sessions_current_bin_id',
        'transfer_sessions', 'bins',
        ['current_bin_id'], ['id']
    )
    op.create_index(op.f('ix_transfer_sessions_current_bin_id'), 'transfer_sessions', ['current_bin_id'], unique=False)
    
    # Add current_bin_start_timestamp column
    op.add_column('transfer_sessions', sa.Column('current_bin_start_timestamp', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Remove current_bin_id and current_bin_start_timestamp columns from transfer_sessions."""
    op.drop_column('transfer_sessions', 'current_bin_start_timestamp')
    op.drop_index(op.f('ix_transfer_sessions_current_bin_id'), table_name='transfer_sessions')
    op.drop_constraint('fk_transfer_sessions_current_bin_id', 'transfer_sessions', type_='foreignkey')
    op.drop_column('transfer_sessions', 'current_bin_id')
