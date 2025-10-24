"""add_magnet_id_to_transfer_sessions

Revision ID: a86fbbd1c7d8
Revises: 1ccfa987e27c
Create Date: 2025-10-24 11:18:05.804574

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a86fbbd1c7d8'
down_revision: Union[str, Sequence[str], None] = '1ccfa987e27c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
