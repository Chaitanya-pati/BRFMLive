"""add_godown_and_unloading_tables

Revision ID: 0e2032d79a84
Revises: 71504f8f80a3
Create Date: 2025-10-07 06:04:00.672915

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0e2032d79a84'
down_revision: Union[str, Sequence[str], None] = '71504f8f80a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('godown_master',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('capacity', sa.Integer(), nullable=False),
    sa.Column('type', sa.String(length=50), nullable=False),
    sa.Column('current_storage', sa.Float(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_godown_master_id'), 'godown_master', ['id'], unique=False)
    
    op.create_table('unloading_entries',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('vehicle_entry_id', sa.Integer(), nullable=False),
    sa.Column('godown_id', sa.Integer(), nullable=False),
    sa.Column('gross_weight', sa.Float(), nullable=False),
    sa.Column('empty_vehicle_weight', sa.Float(), nullable=False),
    sa.Column('net_weight', sa.Float(), nullable=False),
    sa.Column('before_unloading_image', sa.String(length=500), nullable=True),
    sa.Column('after_unloading_image', sa.String(length=500), nullable=True),
    sa.Column('unloading_start_time', sa.DateTime(), nullable=True),
    sa.Column('unloading_end_time', sa.DateTime(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['vehicle_entry_id'], ['vehicle_entries.id'], ),
    sa.ForeignKeyConstraint(['godown_id'], ['godown_master.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_unloading_entries_id'), 'unloading_entries', ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_unloading_entries_id'), table_name='unloading_entries')
    op.drop_table('unloading_entries')
    op.drop_index(op.f('ix_godown_master_id'), table_name='godown_master')
    op.drop_table('godown_master')
