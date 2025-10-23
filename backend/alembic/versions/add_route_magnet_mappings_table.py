
"""add_route_magnet_mappings_table

Revision ID: 3533733002c8
Revises: 2422632991b7
Create Date: 2025-10-23 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3533733002c8'
down_revision: Union[str, Sequence[str], None] = '2422632991b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create route_magnet_mappings table."""
    op.create_table('route_magnet_mappings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('magnet_id', sa.Integer(), nullable=False),
        sa.Column('source_godown_id', sa.Integer(), nullable=False),
        sa.Column('destination_bin_id', sa.Integer(), nullable=False),
        sa.Column('cleaning_interval_hours', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['magnet_id'], ['magnets.id'], ),
        sa.ForeignKeyConstraint(['source_godown_id'], ['godown_master.id'], ),
        sa.ForeignKeyConstraint(['destination_bin_id'], ['bins.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_route_magnet_mappings_id'), 'route_magnet_mappings', ['id'], unique=False)


def downgrade() -> None:
    """Drop route_magnet_mappings table."""
    op.drop_index(op.f('ix_route_magnet_mappings_id'), table_name='route_magnet_mappings')
    op.drop_table('route_magnet_mappings')
