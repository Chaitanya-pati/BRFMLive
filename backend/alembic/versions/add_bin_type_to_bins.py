
"""add_bin_type_column

Revision ID: add_bin_type_001
Revises: 
Create Date: 2025-01-18

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_bin_type_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add bin_type column to bins table
    op.add_column('bins', sa.Column('bin_type', sa.String(length=50), nullable=True))


def downgrade():
    # Remove bin_type column from bins table
    op.drop_column('bins', 'bin_type')
