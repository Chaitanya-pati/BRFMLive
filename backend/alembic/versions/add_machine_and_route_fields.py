
"""add_machine_and_route_fields

Revision ID: add_machine_route_fields
Revises: b345b4c06510
Create Date: 2025-01-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_machine_route_fields'
down_revision: Union[str, Sequence[str], None] = 'b345b4c06510'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add make and serial_number to machines, interval_hours to route_stages."""
    # Add make and serial_number columns to machines table
    op.add_column('machines', sa.Column('make', sa.String(length=100), nullable=True))
    op.add_column('machines', sa.Column('serial_number', sa.String(length=100), nullable=True))
    
    # Add interval_hours column to route_stages table
    op.add_column('route_stages', sa.Column('interval_hours', sa.Float(), nullable=True))


def downgrade() -> None:
    """Remove added columns."""
    op.drop_column('route_stages', 'interval_hours')
    op.drop_column('machines', 'serial_number')
    op.drop_column('machines', 'make')
