"""add_all_missing_columns

Revision ID: 233e0fc7954e
Revises: 3963149c5bb0
Create Date: 2025-11-13 06:51:51.483438

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '233e0fc7954e'
down_revision: Union[str, Sequence[str], None] = '3963149c5bb0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add missing columns to vehicle_entries
    op.add_column('vehicle_entries', sa.Column('empty_weight', sa.Float(), nullable=True))
    op.add_column('vehicle_entries', sa.Column('gross_weight', sa.Float(), nullable=True))
    op.add_column('vehicle_entries', sa.Column('vehicle_photo_front', sa.LargeBinary(), nullable=True))
    op.add_column('vehicle_entries', sa.Column('vehicle_photo_back', sa.LargeBinary(), nullable=True))
    op.add_column('vehicle_entries', sa.Column('vehicle_photo_side', sa.LargeBinary(), nullable=True))
    op.add_column('vehicle_entries', sa.Column('internal_weighment_slip', sa.LargeBinary(), nullable=True))
    op.add_column('vehicle_entries', sa.Column('client_weighment_slip', sa.LargeBinary(), nullable=True))
    op.add_column('vehicle_entries', sa.Column('transportation_copy', sa.LargeBinary(), nullable=True))
    
    # Add missing columns to lab_tests
    op.add_column('lab_tests', sa.Column('wheat_variety', sa.String(100), nullable=True))
    op.add_column('lab_tests', sa.Column('bill_number', sa.String(50), nullable=True))
    op.add_column('lab_tests', sa.Column('category', sa.String(50), nullable=True))
    op.add_column('lab_tests', sa.Column('raise_claim', sa.Boolean(), nullable=True, server_default='false'))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove columns from lab_tests
    op.drop_column('lab_tests', 'raise_claim')
    op.drop_column('lab_tests', 'category')
    op.drop_column('lab_tests', 'bill_number')
    op.drop_column('lab_tests', 'wheat_variety')
    
    # Remove columns from vehicle_entries
    op.drop_column('vehicle_entries', 'transportation_copy')
    op.drop_column('vehicle_entries', 'client_weighment_slip')
    op.drop_column('vehicle_entries', 'internal_weighment_slip')
    op.drop_column('vehicle_entries', 'vehicle_photo_side')
    op.drop_column('vehicle_entries', 'vehicle_photo_back')
    op.drop_column('vehicle_entries', 'vehicle_photo_front')
    op.drop_column('vehicle_entries', 'gross_weight')
    op.drop_column('vehicle_entries', 'empty_weight')
