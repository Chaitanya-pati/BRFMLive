
"""add_magnets_table

Revision ID: 2422632991b7
Revises: 1311631991b6
Create Date: 2025-10-23 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2422632991b7'
down_revision: Union[str, Sequence[str], None] = '1311631991b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create magnets table."""
    op.create_table('magnets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'FULL', name='binstatus'), nullable=False, server_default='ACTIVE'),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_magnets_id'), 'magnets', ['id'], unique=False)


def downgrade() -> None:
    """Drop magnets table."""
    op.drop_index(op.f('ix_magnets_id'), table_name='magnets')
    op.drop_table('magnets')
