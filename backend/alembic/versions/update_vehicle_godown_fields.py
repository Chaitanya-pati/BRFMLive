
"""update vehicle and godown fields

Revision ID: update_vehicle_godown_fields
Revises: 6f2166d6a8f5
Create Date: 2025-01-15 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'update_vehicle_godown_fields'
down_revision = '6f2166d6a8f5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add empty_weight and gross_weight to vehicle_entries
    op.add_column('vehicle_entries', sa.Column('empty_weight', sa.Float(), nullable=True))
    op.add_column('vehicle_entries', sa.Column('gross_weight', sa.Float(), nullable=True))


def downgrade() -> None:
    # Remove empty_weight and gross_weight from vehicle_entries
    op.drop_column('vehicle_entries', 'gross_weight')
    op.drop_column('vehicle_entries', 'empty_weight')
