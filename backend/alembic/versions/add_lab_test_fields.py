
"""add lab test fields

Revision ID: add_lab_test_fields
Revises: 0b1428b871fb
Create Date: 2025-01-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_lab_test_fields'
down_revision: Union[str, None] = '0b1428b871fb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if columns exist before adding them
    from sqlalchemy import inspect
    from sqlalchemy.engine import reflection
    
    conn = op.get_bind()
    inspector = inspect(conn)
    existing_columns = [col['name'] for col in inspector.get_columns('lab_tests')]
    
    # Add new columns to lab_tests table if they don't exist
    if 'document_no' not in existing_columns:
        op.add_column('lab_tests', sa.Column('document_no', sa.String(length=50), nullable=True))
    
    if 'issue_no' not in existing_columns:
        op.add_column('lab_tests', sa.Column('issue_no', sa.String(length=10), nullable=True))
    
    if 'issue_date' not in existing_columns:
        op.add_column('lab_tests', sa.Column('issue_date', sa.DateTime(), nullable=True))
    
    if 'department' not in existing_columns:
        op.add_column('lab_tests', sa.Column('department', sa.String(length=50), nullable=True))
    
    if 'wheat_variety' not in existing_columns:
        op.add_column('lab_tests', sa.Column('wheat_variety', sa.String(length=100), nullable=True))
    
    if 'bill_number' not in existing_columns:
        op.add_column('lab_tests', sa.Column('bill_number', sa.String(length=100), nullable=True))
    
    if 'category' not in existing_columns:
        op.add_column('lab_tests', sa.Column('category', sa.String(length=50), nullable=True))


def downgrade() -> None:
    # Remove the columns if we need to rollback
    op.drop_column('lab_tests', 'category')
    op.drop_column('lab_tests', 'bill_number')
    op.drop_column('lab_tests', 'wheat_variety')
    op.drop_column('lab_tests', 'department')
    op.drop_column('lab_tests', 'issue_date')
    op.drop_column('lab_tests', 'issue_no')
    op.drop_column('lab_tests', 'document_no')
