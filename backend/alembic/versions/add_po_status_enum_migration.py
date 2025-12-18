"""add production order status enum

Revision ID: add_po_status_enum
Revises: 76620822fb5b
Create Date: 2025-12-18 04:59:35.440374

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_po_status_enum'
down_revision: Union[str, Sequence[str], None] = '76620822fb5b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create enum type for production order status
    productionorderstatus_enum = sa.Enum(
        'CREATED', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED',
        name='productionorderstatus'
    )
    productionorderstatus_enum.create(op.get_bind(), checkfirst=True)
    
    # Alter the status column to use the enum type
    op.alter_column(
        'production_orders',
        'status',
        existing_type=sa.String(length=50),
        type_=productionorderstatus_enum,
        existing_nullable=False,
        postgresql_using='status::productionorderstatus'
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Revert to string type
    op.alter_column(
        'production_orders',
        'status',
        existing_type=sa.Enum('CREATED', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', name='productionorderstatus'),
        type_=sa.String(length=50),
        existing_nullable=False,
        postgresql_using='status::text'
    )
    
    # Drop enum type
    productionorderstatus_enum = sa.Enum(
        'CREATED', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED',
        name='productionorderstatus'
    )
    productionorderstatus_enum.drop(op.get_bind(), checkfirst=True)
