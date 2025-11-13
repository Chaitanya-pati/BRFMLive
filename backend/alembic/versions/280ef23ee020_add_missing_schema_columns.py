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
    # Add missing columns to suppliers table
    op.add_column('suppliers', sa.Column('email', sa.String(255), nullable=True))
    op.add_column('suppliers', sa.Column('street', sa.String(255), nullable=True))
    op.add_column('suppliers', sa.Column('district', sa.String(100), nullable=True))
    op.add_column('suppliers', sa.Column('zip_code', sa.String(20), nullable=True))
    op.add_column('suppliers', sa.Column('gstin', sa.String(15), nullable=True))
    
    # Add missing columns to vehicle_entries table
    op.add_column('vehicle_entries', sa.Column('empty_weight', sa.Float(), nullable=True))
    op.add_column('vehicle_entries', sa.Column('gross_weight', sa.Float(), nullable=True))
    op.add_column('vehicle_entries', sa.Column('vehicle_photo_front', sa.LargeBinary(), nullable=True))
    op.add_column('vehicle_entries', sa.Column('vehicle_photo_back', sa.LargeBinary(), nullable=True))
    op.add_column('vehicle_entries', sa.Column('vehicle_photo_side', sa.LargeBinary(), nullable=True))
    op.add_column('vehicle_entries', sa.Column('internal_weighment_slip', sa.LargeBinary(), nullable=True))
    op.add_column('vehicle_entries', sa.Column('client_weighment_slip', sa.LargeBinary(), nullable=True))
    op.add_column('vehicle_entries', sa.Column('transportation_copy', sa.LargeBinary(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove added columns from vehicle_entries table
    op.drop_column('vehicle_entries', 'transportation_copy')
    op.drop_column('vehicle_entries', 'client_weighment_slip')
    op.drop_column('vehicle_entries', 'internal_weighment_slip')
    op.drop_column('vehicle_entries', 'vehicle_photo_side')
    op.drop_column('vehicle_entries', 'vehicle_photo_back')
    op.drop_column('vehicle_entries', 'vehicle_photo_front')
    op.drop_column('vehicle_entries', 'gross_weight')
    op.drop_column('vehicle_entries', 'empty_weight')
    
    # Remove added columns from suppliers table
    op.drop_column('suppliers', 'gstin')
    op.drop_column('suppliers', 'zip_code')
    op.drop_column('suppliers', 'district')
    op.drop_column('suppliers', 'street')
    op.drop_column('suppliers', 'email')
