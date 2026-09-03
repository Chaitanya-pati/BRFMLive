"""add external dispatch details

Revision ID: add_external_dispatch_details
Revises: c4e1a2b3d5f6
Create Date: 2026-08-27 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "add_external_dispatch_details"
down_revision: Union[str, Sequence[str], None] = "c4e1a2b3d5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "dispatch",
        "driver_id",
        existing_type=sa.Integer(),
        nullable=True,
    )
    op.add_column(
        "dispatch",
        sa.Column("transport_type", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "dispatch",
        sa.Column("external_driver_name", sa.String(length=150), nullable=True),
    )
    op.add_column(
        "dispatch",
        sa.Column("external_driver_phone", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "dispatch",
        sa.Column("external_vehicle_number", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "dispatch",
        sa.Column("external_party_name", sa.String(length=150), nullable=True),
    )
    op.execute("UPDATE dispatch SET transport_type = 'INTERNAL' WHERE transport_type IS NULL")
    op.alter_column(
        "dispatch",
        "transport_type",
        existing_type=sa.String(length=20),
        nullable=False,
        server_default="INTERNAL",
    )


def downgrade() -> None:
    op.drop_column("dispatch", "external_party_name")
    op.drop_column("dispatch", "external_vehicle_number")
    op.drop_column("dispatch", "external_driver_phone")
    op.drop_column("dispatch", "external_driver_name")
    op.drop_column("dispatch", "transport_type")
    op.alter_column(
        "dispatch",
        "driver_id",
        existing_type=sa.Integer(),
        nullable=False,
    )