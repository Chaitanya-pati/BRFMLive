"""add_claims_table

Revision ID: 5e2db89caa3e
Revises: 0c96d9b03b48
Create Date: 2025-10-06 10:52:48.477221

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5e2db89caa3e'
down_revision: Union[str, Sequence[str], None] = '0c96d9b03b48'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('claims',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('lab_test_id', sa.Integer(), nullable=False),
    sa.Column('issue_found', sa.Text(), nullable=False),
    sa.Column('category_detected', sa.String(length=100), nullable=True),
    sa.Column('claim_date', sa.DateTime(), nullable=True),
    sa.Column('remarks', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['lab_test_id'], ['lab_tests.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_claims_id'), 'claims', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_claims_id'), table_name='claims')
    op.drop_table('claims')
