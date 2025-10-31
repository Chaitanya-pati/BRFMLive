
"""add category to lab test

Revision ID: add_category_field
Revises: 71504f8f80a3
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_category_field'
down_revision = '71504f8f80a3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('lab_tests', sa.Column('category', sa.String(length=50), nullable=True))


def downgrade() -> None:
    op.drop_column('lab_tests', 'category')
