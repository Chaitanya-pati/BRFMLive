"""add_bins_table

Revision ID: 1311631991b6
Revises: 0e2032d79a84
Create Date: 2025-10-23 11:23:54.569988

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1311631991b6'
down_revision: Union[str, Sequence[str], None] = '0e2032d79a84'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create bins table."""
    op.create_table('bins',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('bin_number', sa.String(length=100), nullable=False),
        sa.Column('capacity', sa.Float(), nullable=False),
        sa.Column('current_quantity', sa.Float(), nullable=True, server_default='0.0'),
        sa.Column('material_type', sa.String(length=100), nullable=True),
        sa.Column('status', sa.Enum('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'FULL', name='binstatus'), nullable=False, server_default='ACTIVE'),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('bin_number')
    )
    op.create_index(op.f('ix_bins_id'), 'bins', ['id'], unique=False)


def downgrade() -> None:
    """Drop bins table."""
    op.drop_index(op.f('ix_bins_id'), table_name='bins')
    op.drop_table('bins')
