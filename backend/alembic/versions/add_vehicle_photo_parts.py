
"""add vehicle photo parts

Revision ID: add_vehicle_photo_parts
Revises: 0b1428b871fb
Create Date: 2025-01-16 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_vehicle_photo_parts'
down_revision = '0b1428b871fb'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns for three vehicle photos
    op.add_column('vehicle_entries', sa.Column('vehicle_photo_front', sa.LargeBinary(), nullable=True))
    op.add_column('vehicle_entries', sa.Column('vehicle_photo_back', sa.LargeBinary(), nullable=True))
    op.add_column('vehicle_entries', sa.Column('vehicle_photo_side', sa.LargeBinary(), nullable=True))
    
    # Migrate existing vehicle_photo data to vehicle_photo_front if it exists
    op.execute("""
        UPDATE vehicle_entries 
        SET vehicle_photo_front = vehicle_photo 
        WHERE vehicle_photo IS NOT NULL
    """)


def downgrade():
    op.drop_column('vehicle_entries', 'vehicle_photo_side')
    op.drop_column('vehicle_entries', 'vehicle_photo_back')
    op.drop_column('vehicle_entries', 'vehicle_photo_front')
