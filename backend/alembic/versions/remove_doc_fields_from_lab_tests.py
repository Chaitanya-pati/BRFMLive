
"""remove document fields from lab tests

Revision ID: remove_doc_fields_001
Revises: 109aef2461c4
Create Date: 2025-01-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'remove_doc_fields_001'
down_revision: Union[str, None] = '109aef2461c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove document-related fields from lab_tests table"""
    op.drop_column('lab_tests', 'document_no')
    op.drop_column('lab_tests', 'issue_no')
    op.drop_column('lab_tests', 'issue_date')
    op.drop_column('lab_tests', 'department')


def downgrade() -> None:
    """Restore document-related fields to lab_tests table"""
    op.add_column('lab_tests', sa.Column('document_no', sa.String(length=50), nullable=True))
    op.add_column('lab_tests', sa.Column('issue_no', sa.String(length=10), nullable=True))
    op.add_column('lab_tests', sa.Column('issue_date', sa.DateTime(), nullable=True))
    op.add_column('lab_tests', sa.Column('department', sa.String(length=50), nullable=True))
