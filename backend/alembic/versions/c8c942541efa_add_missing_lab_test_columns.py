"""add_missing_lab_test_columns

Revision ID: c8c942541efa
Revises: 280ef23ee020
Create Date: 2025-11-13 04:55:26.226876

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8c942541efa'
down_revision: Union[str, Sequence[str], None] = '280ef23ee020'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('lab_tests')]
    
    # Add missing columns to lab_tests table
    if 'wheat_variety' not in columns:
        op.add_column('lab_tests', sa.Column('wheat_variety', sa.String(100), nullable=True))
    if 'bill_number' not in columns:
        op.add_column('lab_tests', sa.Column('bill_number', sa.String(100), nullable=True))
    if 'category' not in columns:
        op.add_column('lab_tests', sa.Column('category', sa.String(50), nullable=True))
    if 'raise_claim' not in columns:
        op.add_column('lab_tests', sa.Column('raise_claim', sa.Integer(), default=0, nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove added columns from lab_tests table
    op.drop_column('lab_tests', 'raise_claim')
    op.drop_column('lab_tests', 'category')
    op.drop_column('lab_tests', 'bill_number')
    op.drop_column('lab_tests', 'wheat_variety')
