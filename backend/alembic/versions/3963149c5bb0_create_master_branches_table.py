"""create_master_branches_table

Revision ID: 3963149c5bb0
Revises: e136788c1e5e
Create Date: 2025-11-13 06:45:27.671229

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3963149c5bb0'
down_revision: Union[str, Sequence[str], None] = 'e136788c1e5e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'master_branches',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('branch_name', sa.String(length=255), nullable=False),
        sa.Column('branch_code', sa.String(length=50), nullable=False),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('branch_name'),
        sa.UniqueConstraint('branch_code')
    )
    
    op.add_column('suppliers', sa.Column('branch_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_suppliers_branch', 'suppliers', 'master_branches', ['branch_id'], ['id'])
    
    op.add_column('vehicle_entries', sa.Column('branch_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_vehicle_entries_branch', 'vehicle_entries', 'master_branches', ['branch_id'], ['id'])
    
    op.add_column('lab_tests', sa.Column('branch_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_lab_tests_branch', 'lab_tests', 'master_branches', ['branch_id'], ['id'])
    
    op.add_column('godown_master', sa.Column('branch_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_godown_master_branch', 'godown_master', 'master_branches', ['branch_id'], ['id'])
    
    op.add_column('bins', sa.Column('branch_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_bins_branch', 'bins', 'master_branches', ['branch_id'], ['id'])
    
    op.add_column('magnets', sa.Column('branch_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_magnets_branch', 'magnets', 'master_branches', ['branch_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_magnets_branch', 'magnets', type_='foreignkey')
    op.drop_column('magnets', 'branch_id')
    
    op.drop_constraint('fk_bins_branch', 'bins', type_='foreignkey')
    op.drop_column('bins', 'branch_id')
    
    op.drop_constraint('fk_godown_master_branch', 'godown_master', type_='foreignkey')
    op.drop_column('godown_master', 'branch_id')
    
    op.drop_constraint('fk_lab_tests_branch', 'lab_tests', type_='foreignkey')
    op.drop_column('lab_tests', 'branch_id')
    
    op.drop_constraint('fk_vehicle_entries_branch', 'vehicle_entries', type_='foreignkey')
    op.drop_column('vehicle_entries', 'branch_id')
    
    op.drop_constraint('fk_suppliers_branch', 'suppliers', type_='foreignkey')
    op.drop_column('suppliers', 'branch_id')
    
    op.drop_table('master_branches')
