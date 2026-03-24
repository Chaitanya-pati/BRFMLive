"""make_dispatch_order_id_nullable

Revision ID: b9f6d93e86bf
Revises: 2e31abde38ac
Create Date: 2026-03-24 05:32:37.015313

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b9f6d93e86bf'
down_revision: Union[str, Sequence[str], None] = '2e31abde38ac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Make dispatch.order_id nullable to support multi-order dispatches.
    # Each dispatch item already carries its own order_item_id, so the
    # parent order can be derived from items rather than the header column.
    op.alter_column(
        'dispatch',
        'order_id',
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:
    # Revert: set order_id back to NOT NULL.
    # WARNING: any rows where order_id IS NULL will cause this to fail.
    # Populate nulls before running downgrade.
    op.alter_column(
        'dispatch',
        'order_id',
        existing_type=sa.Integer(),
        nullable=False,
    )
