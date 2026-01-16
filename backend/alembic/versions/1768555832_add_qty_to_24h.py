"""add quantity_transferred to 24hours_transfer_records

Revision ID: 1768555832
Revises: 1768555831
Create Date: 2026-01-16 09:30:32

"""
from alembic import op
import sqlalchemy as sa

revision = '1768555832'
down_revision = '4c3fda579a0a'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('24hours_transfer_records', sa.Column('quantity_transferred', sa.Float(), nullable=True))

def downgrade():
    op.drop_column('24hours_transfer_records', 'quantity_transferred')
