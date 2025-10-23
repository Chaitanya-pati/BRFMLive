
"""add lab test document fields

Revision ID: add_lab_test_doc_fields
Revises: add_category_field
Create Date: 2025-01-23 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_lab_test_doc_fields'
down_revision = 'add_category_field'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('lab_tests', sa.Column('document_no', sa.String(length=50), nullable=True))
    op.add_column('lab_tests', sa.Column('issue_no', sa.String(length=10), nullable=True))
    op.add_column('lab_tests', sa.Column('issue_date', sa.DateTime(), nullable=True))
    op.add_column('lab_tests', sa.Column('department', sa.String(length=50), nullable=True))
    op.add_column('lab_tests', sa.Column('wheat_variety', sa.String(length=100), nullable=True))
    op.add_column('lab_tests', sa.Column('bill_number', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('lab_tests', 'bill_number')
    op.drop_column('lab_tests', 'wheat_variety')
    op.drop_column('lab_tests', 'department')
    op.drop_column('lab_tests', 'issue_date')
    op.drop_column('lab_tests', 'issue_no')
    op.drop_column('lab_tests', 'document_no')
