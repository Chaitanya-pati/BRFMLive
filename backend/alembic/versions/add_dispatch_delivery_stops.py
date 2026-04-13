"""add_dispatch_delivery_stops

Revision ID: c4e1a2b3d5f6
Revises: b9f6d93e86bf
Create Date: 2026-04-13 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c4e1a2b3d5f6'
down_revision: Union[str, Sequence[str], None] = 'b9f6d93e86bf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'dispatch_delivery_stops',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('dispatch_id', sa.Integer(), nullable=False),
        sa.Column('order_id', sa.Integer(), nullable=True),
        sa.Column('customer_name', sa.String(length=200), nullable=True),
        sa.Column('arrived_at', sa.DateTime(), nullable=True),
        sa.Column('unloading_start', sa.DateTime(), nullable=True),
        sa.Column('unloading_end', sa.DateTime(), nullable=True),
        sa.Column('driver_signature', sa.Text(), nullable=True),
        sa.Column('customer_signature', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['dispatch_id'], ['dispatch.dispatch_id']),
        sa.ForeignKeyConstraint(['order_id'], ['customer_orders.order_id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_dispatch_delivery_stops_id'), 'dispatch_delivery_stops', ['id'], unique=False)

    op.create_table(
        'dispatch_stop_photos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('stop_id', sa.Integer(), nullable=False),
        sa.Column('photo_path', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['stop_id'], ['dispatch_delivery_stops.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_dispatch_stop_photos_id'), 'dispatch_stop_photos', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_dispatch_stop_photos_id'), table_name='dispatch_stop_photos')
    op.drop_table('dispatch_stop_photos')
    op.drop_index(op.f('ix_dispatch_delivery_stops_id'), table_name='dispatch_delivery_stops')
    op.drop_table('dispatch_delivery_stops')
