
"""add weighment and transport images

Revision ID: add_weighment_transport_images
Revises: add_vehicle_photo_parts
Create Date: 2025-01-16 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_weighment_transport_images'
down_revision = 'add_vehicle_photo_parts'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns for weighment slips and transportation copy
    op.add_column('vehicle_entries', sa.Column('internal_weighment_slip', sa.LargeBinary(), nullable=True))
    op.add_column('vehicle_entries', sa.Column('client_weighment_slip', sa.LargeBinary(), nullable=True))
    op.add_column('vehicle_entries', sa.Column('transportation_copy', sa.LargeBinary(), nullable=True))


def downgrade():
    op.drop_column('vehicle_entries', 'transportation_copy')
    op.drop_column('vehicle_entries', 'client_weighment_slip')
    op.drop_column('vehicle_entries', 'internal_weighment_slip')
