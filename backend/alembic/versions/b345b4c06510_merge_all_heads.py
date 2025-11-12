"""merge all heads

Revision ID: b345b4c06510
Revises: d21004369763, remove_doc_fields_001
Create Date: 2025-11-12 11:18:22.479974

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b345b4c06510'
down_revision: Union[str, Sequence[str], None] = ('d21004369763', 'remove_doc_fields_001')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
