"""add_branches_and_users_tables

Revision ID: 745207073606
Revises: 442e078ad29e
Create Date: 2025-11-15 08:00:28.341450

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '745207073606'
down_revision: Union[str, Sequence[str], None] = '442e078ad29e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('branches',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_branches_id'), 'branches', ['id'], unique=False)
    
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    
    op.create_table('user_branches',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_branches_id'), 'user_branches', ['id'], unique=False)
    
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    for table_name in ['suppliers', 'vehicle_entries', 'lab_tests', 'godown_master', 'unloading_entries', 'bins', 'magnets']:
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        if 'branch_id' not in columns:
            op.add_column(table_name, sa.Column('branch_id', sa.Integer(), nullable=True))
            op.create_foreign_key(f'fk_{table_name}_branch_id', table_name, 'branches', ['branch_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    for table_name in ['suppliers', 'vehicle_entries', 'lab_tests', 'godown_master', 'unloading_entries', 'bins', 'magnets']:
        op.drop_constraint(f'fk_{table_name}_branch_id', table_name, type_='foreignkey')
        op.drop_column(table_name, 'branch_id')
    
    op.drop_index(op.f('ix_user_branches_id'), table_name='user_branches')
    op.drop_table('user_branches')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')
    op.drop_index(op.f('ix_branches_id'), table_name='branches')
    op.drop_table('branches')
