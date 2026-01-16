"""add quantity_transferred to transfer_sessions

Revision ID: 1768555759
Revises: 4c3fda579a0a
Create Date: 2026-01-16 09:29:19

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '1768555760'
down_revision = '4c3fda579a0a'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('transfer_sessions', sa.Column('quantity_transferred', sa.Float(), nullable=True))

def downgrade():
    op.drop_column('transfer_sessions', 'quantity_transferred')
