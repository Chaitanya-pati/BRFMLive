"""add_waste_entries_table

Revision ID: 982d49b53ecc
Revises: add_lab_test_fields
Create Date: 2025-11-06 11:23:05.010598

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '982d49b53ecc'
down_revision: Union[str, Sequence[str], None] = 'add_lab_test_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'waste_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('transfer_session_id', sa.Integer(), nullable=False),
        sa.Column('godown_id', sa.Integer(), nullable=False),
        sa.Column('waste_weight', sa.Float(), nullable=False),
        sa.Column('waste_type', sa.String(length=100), nullable=True),
        sa.Column('recorded_timestamp', sa.DateTime(), nullable=False),
        sa.Column('recorded_by', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['godown_id'], ['godown_master.id'], ),
        sa.ForeignKeyConstraint(['transfer_session_id'], ['transfer_sessions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_waste_entries_id'), 'waste_entries', ['id'], unique=False)
    op.create_index(op.f('ix_waste_entries_transfer_session_id'), 'waste_entries', ['transfer_session_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_waste_entries_transfer_session_id'), table_name='waste_entries')
    op.drop_index(op.f('ix_waste_entries_id'), table_name='waste_entries')
    op.drop_table('waste_entries')
