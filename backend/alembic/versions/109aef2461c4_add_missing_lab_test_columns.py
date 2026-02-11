"""add_missing_lab_test_columns

Revision ID: 109aef2461c4
Revises: add_supplier_new_fields
Create Date: 2025-11-11 05:24:29.248598

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '109aef2461c4'
down_revision: Union[str, Sequence[str], None] = 'add_supplier_new_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('lab_tests', sa.Column('document_no', sa.String(length=50), nullable=True))
    op.add_column('lab_tests', sa.Column('issue_no', sa.String(length=10), nullable=True))
    op.add_column('lab_tests', sa.Column('issue_date', sa.DateTime(), nullable=True))
    op.add_column('lab_tests', sa.Column('department', sa.String(length=50), nullable=True))
    op.add_column('lab_tests', sa.Column('wheat_variety', sa.String(length=100), nullable=True))
    op.add_column('lab_tests', sa.Column('bill_number', sa.String(length=100), nullable=True))
    op.add_column('lab_tests', sa.Column('category', sa.String(length=50), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('lab_tests', 'category')
    op.drop_column('lab_tests', 'bill_number')
    op.drop_column('lab_tests', 'wheat_variety')
    op.drop_column('lab_tests', 'department')
    op.drop_column('lab_tests', 'issue_date')
    op.drop_column('lab_tests', 'issue_no')
    op.drop_column('lab_tests', 'document_no')
