"""add_transfer_sessions_and_update_cleaning_records

Revision ID: e1180f7f132e
Revises: 3533733991b8
Create Date: 2025-10-23 13:10:19.287807

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e1180f7f132e'
down_revision: Union[str, Sequence[str], None] = '3533733991b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create transfer_sessions table and add transfer_session_id to magnet_cleaning_records."""
    # Create transfer_sessions table
    op.create_table('transfer_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('source_godown_id', sa.Integer(), nullable=False),
        sa.Column('destination_bin_id', sa.Integer(), nullable=False),
        sa.Column('start_timestamp', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('stop_timestamp', sa.DateTime(), nullable=True),
        sa.Column('transferred_quantity', sa.Float(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='active'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['source_godown_id'], ['godown_master.id'], ),
        sa.ForeignKeyConstraint(['destination_bin_id'], ['bins.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_transfer_sessions_id'), 'transfer_sessions', ['id'], unique=False)
    
    # Add transfer_session_id column to magnet_cleaning_records
    op.add_column('magnet_cleaning_records', 
                  sa.Column('transfer_session_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_magnet_cleaning_records_transfer_session', 
                         'magnet_cleaning_records', 'transfer_sessions', 
                         ['transfer_session_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_magnet_cleaning_records_transfer_session_id'), 
                   'magnet_cleaning_records', ['transfer_session_id'], unique=False)


def downgrade() -> None:
    """Drop transfer_sessions table and remove transfer_session_id from magnet_cleaning_records."""
    # Remove transfer_session_id from magnet_cleaning_records
    op.drop_index(op.f('ix_magnet_cleaning_records_transfer_session_id'), table_name='magnet_cleaning_records')
    op.drop_constraint('fk_magnet_cleaning_records_transfer_session', 'magnet_cleaning_records', type_='foreignkey')
    op.drop_column('magnet_cleaning_records', 'transfer_session_id')
    
    # Drop transfer_sessions table
    op.drop_index(op.f('ix_transfer_sessions_id'), table_name='transfer_sessions')
    op.drop_table('transfer_sessions')
