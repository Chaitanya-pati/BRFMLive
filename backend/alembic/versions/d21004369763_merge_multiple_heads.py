"""merge_multiple_heads

Revision ID: d21004369763
Revises: a86ef249d96b, add_weighment_transport_images
Create Date: 2025-11-12 06:32:42.326628

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd21004369763'
down_revision: Union[str, Sequence[str], None] = ('a86ef249d96b', 'add_weighment_transport_images')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
