"""merge_heads

Revision ID: 56a0e3204130
Revises: 223ce95b4883, update_vehicle_godown_fields
Create Date: 2025-11-12 13:06:14.032737

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '56a0e3204130'
down_revision: Union[str, Sequence[str], None] = ('223ce95b4883', 'update_vehicle_godown_fields')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
