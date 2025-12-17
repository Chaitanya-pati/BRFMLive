"""add_production_order_planning_tables

Revision ID: 76620822fb5b
Revises: 4c3fda579a0a
Create Date: 2025-12-17 09:17:15.334000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '76620822fb5b'
down_revision: Union[str, Sequence[str], None] = '4c3fda579a0a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create production_order_source_bins table for blend configuration
    op.create_table('production_order_source_bins',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('production_order_id', sa.Integer(), nullable=False),
        sa.Column('bin_id', sa.Integer(), nullable=False),
        sa.Column('blend_percentage', sa.Float(), nullable=False),
        sa.Column('quantity', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['bin_id'], ['bins.id'], ),
        sa.ForeignKeyConstraint(['production_order_id'], ['production_orders.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_production_order_source_bins_id'), 'production_order_source_bins', ['id'], unique=False)

    # Create production_order_destination_bins table for distribution configuration
    op.create_table('production_order_destination_bins',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('production_order_id', sa.Integer(), nullable=False),
        sa.Column('bin_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['bin_id'], ['bins.id'], ),
        sa.ForeignKeyConstraint(['production_order_id'], ['production_orders.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_production_order_destination_bins_id'), 'production_order_destination_bins', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_production_order_destination_bins_id'), table_name='production_order_destination_bins')
    op.drop_table('production_order_destination_bins')
    op.drop_index(op.f('ix_production_order_source_bins_id'), table_name='production_order_source_bins')
    op.drop_table('production_order_source_bins')
