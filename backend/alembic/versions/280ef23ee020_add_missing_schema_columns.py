"""add_missing_schema_columns

Revision ID: 280ef23ee020
Revises: 56a0e3204130
Create Date: 2025-11-13 04:24:31.522397

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '280ef23ee020'
down_revision: Union[str, Sequence[str], None] = '56a0e3204130'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
