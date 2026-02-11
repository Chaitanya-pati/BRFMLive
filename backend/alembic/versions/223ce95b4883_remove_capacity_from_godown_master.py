"""remove_capacity_from_godown_master

Revision ID: 223ce95b4883
Revises: 6f2166d6a8f5
Create Date: 2025-11-12 11:44:38.201922

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '223ce95b4883'
down_revision: Union[str, Sequence[str], None] = '6f2166d6a8f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column('godown_master', 'capacity')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('godown_master', sa.Column('capacity', sa.Integer(), nullable=True))
    op.execute("UPDATE godown_master SET capacity = 1000 WHERE capacity IS NULL")
    op.alter_column('godown_master', 'capacity', nullable=False)
