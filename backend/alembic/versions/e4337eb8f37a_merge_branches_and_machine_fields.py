"""merge_branches_and_machine_fields

Revision ID: e4337eb8f37a
Revises: 745207073606, add_machine_route_fields
Create Date: 2025-11-17 12:53:34.573456

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4337eb8f37a'
down_revision: Union[str, Sequence[str], None] = ('745207073606', 'add_machine_route_fields')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add foreign key constraints for branch_id columns."""
    # Add foreign key constraint to machines.branch_id
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Check if machines table exists and add FK if needed
    if 'machines' in inspector.get_table_names():
        op.create_foreign_key(
            'fk_machines_branch_id',
            'machines', 'branches',
            ['branch_id'], ['id']
        )
    
    # Check if route_configurations table exists and add FK if needed
    if 'route_configurations' in inspector.get_table_names():
        op.create_foreign_key(
            'fk_route_configurations_branch_id',
            'route_configurations', 'branches',
            ['branch_id'], ['id']
        )


def downgrade() -> None:
    """Remove foreign key constraints."""
    op.drop_constraint('fk_route_configurations_branch_id', 'route_configurations', type_='foreignkey')
    op.drop_constraint('fk_machines_branch_id', 'machines', type_='foreignkey')
