
"""add source_bin to route mappings

Revision ID: add_source_bin_col
Revises: add_route_magnet_mappings_table
Create Date: 2025-10-23 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_source_bin_col'
down_revision = 'add_route_magnet_mappings_table'
branch_labels = None
depends_on = None


def upgrade():
    # Add source_bin_id column
    op.add_column('route_magnet_mappings', sa.Column('source_bin_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_route_mappings_source_bin', 'route_magnet_mappings', 'bins', ['source_bin_id'], ['id'])
    
    # Make source_godown_id nullable
    op.alter_column('route_magnet_mappings', 'source_godown_id', nullable=True)


def downgrade():
    op.drop_constraint('fk_route_mappings_source_bin', 'route_magnet_mappings', type_='foreignkey')
    op.drop_column('route_magnet_mappings', 'source_bin_id')
    op.alter_column('route_magnet_mappings', 'source_godown_id', nullable=False)
