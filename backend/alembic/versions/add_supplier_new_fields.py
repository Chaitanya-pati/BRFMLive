
"""add_supplier_fields_zip_street_district_gstin_email

Revision ID: add_supplier_new_fields
Revises: 0b1428b871fb
Create Date: 2025-01-05 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_supplier_new_fields'
down_revision = '0b1428b871fb'
branch_labels = None
depends_on = None


def upgrade():
    # Add new columns to suppliers table
    op.add_column('suppliers', sa.Column('email', sa.String(length=255), nullable=True))
    op.add_column('suppliers', sa.Column('street', sa.String(length=255), nullable=True))
    op.add_column('suppliers', sa.Column('district', sa.String(length=100), nullable=True))
    op.add_column('suppliers', sa.Column('zip_code', sa.String(length=20), nullable=True))
    op.add_column('suppliers', sa.Column('gstin', sa.String(length=15), nullable=True))


def downgrade():
    # Remove new columns from suppliers table
    op.drop_column('suppliers', 'gstin')
    op.drop_column('suppliers', 'zip_code')
    op.drop_column('suppliers', 'district')
    op.drop_column('suppliers', 'street')
    op.drop_column('suppliers', 'email')
