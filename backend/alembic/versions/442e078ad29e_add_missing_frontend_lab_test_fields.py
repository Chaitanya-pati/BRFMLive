"""add_missing_frontend_lab_test_fields

Revision ID: 442e078ad29e
Revises: e136788c1e5e
Create Date: 2025-11-15 07:59:06.331773

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '442e078ad29e'
down_revision: Union[str, Sequence[str], None] = 'e136788c1e5e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('lab_tests')]
    
    if 'hectoliter_weight' not in columns:
        op.add_column('lab_tests', sa.Column('hectoliter_weight', sa.Float(), nullable=True))
    if 'sedimentation_value' not in columns:
        op.add_column('lab_tests', sa.Column('sedimentation_value', sa.Float(), nullable=True))
    if 'other_grains' not in columns:
        op.add_column('lab_tests', sa.Column('other_grains', sa.Float(), nullable=True))
    if 'soft_wheat' not in columns:
        op.add_column('lab_tests', sa.Column('soft_wheat', sa.Float(), nullable=True))
    if 'heat_damaged' not in columns:
        op.add_column('lab_tests', sa.Column('heat_damaged', sa.Float(), nullable=True))
    if 'immature_wheat' not in columns:
        op.add_column('lab_tests', sa.Column('immature_wheat', sa.Float(), nullable=True))
    if 'broken_wheat' not in columns:
        op.add_column('lab_tests', sa.Column('broken_wheat', sa.Float(), nullable=True))
    if 'comments_action' not in columns:
        op.add_column('lab_tests', sa.Column('comments_action', sa.Text(), nullable=True))
    if 'approved' not in columns:
        op.add_column('lab_tests', sa.Column('approved', sa.Boolean(), default=False, nullable=True))
    if 'department' not in columns:
        op.add_column('lab_tests', sa.Column('department', sa.String(length=50), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('lab_tests', 'department')
    op.drop_column('lab_tests', 'approved')
    op.drop_column('lab_tests', 'comments_action')
    op.drop_column('lab_tests', 'broken_wheat')
    op.drop_column('lab_tests', 'immature_wheat')
    op.drop_column('lab_tests', 'heat_damaged')
    op.drop_column('lab_tests', 'soft_wheat')
    op.drop_column('lab_tests', 'other_grains')
    op.drop_column('lab_tests', 'sedimentation_value')
    op.drop_column('lab_tests', 'hectoliter_weight')
