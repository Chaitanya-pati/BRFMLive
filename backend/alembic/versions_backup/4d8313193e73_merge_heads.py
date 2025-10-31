"""merge heads

Revision ID: 4d8313193e73
Revises: add_lab_test_doc_001, e1180f7f132e
Create Date: 2025-10-23 17:10:02.701204

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4d8313193e73'
down_revision: Union[str, Sequence[str], None] = ('add_lab_test_doc_001', 'e1180f7f132e')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
