
"""add_machine_and_route_fields

Revision ID: add_machine_route_fields
Revises: b345b4c06510
Create Date: 2025-01-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_machine_route_fields'
down_revision: Union[str, Sequence[str], None] = 'b345b4c06510'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create machines and route tables with all fields."""
    
    # Create machines table (without FK constraint to branches for now)
    op.create_table('machines',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('machine_type', sa.String(length=50), nullable=False),
        sa.Column('make', sa.String(length=100), nullable=True),
        sa.Column('serial_number', sa.String(length=100), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='Active'),
        sa.Column('branch_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_machines_id'), 'machines', ['id'], unique=False)
    
    # Create route_configurations table (without FK constraint to branches for now)
    op.create_table('route_configurations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('branch_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_route_configurations_id'), 'route_configurations', ['id'], unique=False)
    
    # Create route_stages table
    op.create_table('route_stages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('route_id', sa.Integer(), nullable=False),
        sa.Column('sequence_no', sa.Integer(), nullable=False),
        sa.Column('component_type', sa.String(length=20), nullable=False),
        sa.Column('component_id', sa.Integer(), nullable=False),
        sa.Column('interval_hours', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['route_id'], ['route_configurations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_route_stages_id'), 'route_stages', ['id'], unique=False)


def downgrade() -> None:
    """Drop route and machines tables."""
    op.drop_index(op.f('ix_route_stages_id'), table_name='route_stages')
    op.drop_table('route_stages')
    op.drop_index(op.f('ix_route_configurations_id'), table_name='route_configurations')
    op.drop_table('route_configurations')
    op.drop_index(op.f('ix_machines_id'), table_name='machines')
    op.drop_table('machines')
