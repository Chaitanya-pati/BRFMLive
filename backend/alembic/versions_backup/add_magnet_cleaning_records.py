
"""add_magnet_cleaning_records

Revision ID: 3533733991b8
Revises: add_source_bin_to_route_mappings
Create Date: 2025-01-23 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3533733991b8'
down_revision: Union[str, Sequence[str], None] = 'add_source_bin_col'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create magnet_cleaning_records table."""
    op.create_table('magnet_cleaning_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('magnet_id', sa.Integer(), nullable=False),
        sa.Column('cleaning_timestamp', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('before_cleaning_photo', sa.String(length=500), nullable=True),
        sa.Column('after_cleaning_photo', sa.String(length=500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['magnet_id'], ['magnets.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_magnet_cleaning_records_id'), 'magnet_cleaning_records', ['id'], unique=False)
    op.create_index(op.f('ix_magnet_cleaning_records_magnet_id'), 'magnet_cleaning_records', ['magnet_id'], unique=False)


def downgrade() -> None:
    """Drop magnet_cleaning_records table."""
    op.drop_index(op.f('ix_magnet_cleaning_records_magnet_id'), table_name='magnet_cleaning_records')
    op.drop_index(op.f('ix_magnet_cleaning_records_id'), table_name='magnet_cleaning_records')
    op.drop_table('magnet_cleaning_records')
