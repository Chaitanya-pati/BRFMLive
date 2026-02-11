"""add_claim_status_field

Revision ID: 71504f8f80a3
Revises: 5e2db89caa3e
Create Date: 2025-10-06 12:54:24.916622

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '71504f8f80a3'
down_revision: Union[str, Sequence[str], None] = '5e2db89caa3e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    claim_status_enum = sa.Enum('Open', 'In Progress', 'Closed', name='claimstatus')
    claim_status_enum.create(op.get_bind(), checkfirst=True)
    
    op.add_column('claims', sa.Column('claim_status', claim_status_enum, nullable=False, server_default='Open'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('claims', 'claim_status')
    
    sa.Enum(name='claimstatus').drop(op.get_bind(), checkfirst=True)
