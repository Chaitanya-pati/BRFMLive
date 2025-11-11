"""create all tables

Revision ID: 0b1428b871fb
Revises: 
Create Date: 2025-10-31 08:04:04.183893

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0b1428b871fb'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create suppliers table
    op.create_table('suppliers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('supplier_name', sa.String(length=255), nullable=False),
        sa.Column('contact_person', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('state', sa.String(length=100), nullable=False),
        sa.Column('city', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_suppliers_id'), 'suppliers', ['id'], unique=False)
    
    # Create vehicle_entries table
    op.create_table('vehicle_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vehicle_number', sa.String(length=50), nullable=False),
        sa.Column('supplier_id', sa.Integer(), nullable=False),
        sa.Column('bill_no', sa.String(length=100), nullable=False),
        sa.Column('driver_name', sa.String(length=255), nullable=True),
        sa.Column('driver_phone', sa.String(length=20), nullable=True),
        sa.Column('arrival_time', sa.DateTime(), nullable=True),
        sa.Column('supplier_bill_photo', sa.LargeBinary(), nullable=True),
        sa.Column('vehicle_photo', sa.LargeBinary(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vehicle_entries_id'), 'vehicle_entries', ['id'], unique=False)
    
    # Create lab_tests table
    op.create_table('lab_tests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vehicle_entry_id', sa.Integer(), nullable=False),
        sa.Column('test_date', sa.DateTime(), nullable=True),
        sa.Column('moisture', sa.Float(), nullable=True),
        sa.Column('test_weight', sa.Float(), nullable=True),
        sa.Column('protein_percent', sa.Float(), nullable=True),
        sa.Column('wet_gluten', sa.Float(), nullable=True),
        sa.Column('dry_gluten', sa.Float(), nullable=True),
        sa.Column('falling_number', sa.Integer(), nullable=True),
        sa.Column('chaff_husk', sa.Float(), nullable=True),
        sa.Column('straws_sticks', sa.Float(), nullable=True),
        sa.Column('other_foreign_matter', sa.Float(), nullable=True),
        sa.Column('mudballs', sa.Float(), nullable=True),
        sa.Column('stones', sa.Float(), nullable=True),
        sa.Column('dust_sand', sa.Float(), nullable=True),
        sa.Column('total_impurities', sa.Float(), nullable=True),
        sa.Column('shriveled_wheat', sa.Float(), nullable=True),
        sa.Column('insect_damage', sa.Float(), nullable=True),
        sa.Column('blackened_wheat', sa.Float(), nullable=True),
        sa.Column('sprouted_grains', sa.Float(), nullable=True),
        sa.Column('other_grain_damage', sa.Float(), nullable=True),
        sa.Column('total_dockage', sa.Float(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('tested_by', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['vehicle_entry_id'], ['vehicle_entries.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_lab_tests_id'), 'lab_tests', ['id'], unique=False)
    
    # Create claims table
    op.create_table('claims',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('lab_test_id', sa.Integer(), nullable=False),
        sa.Column('issue_found', sa.Text(), nullable=False),
        sa.Column('category_detected', sa.String(length=100), nullable=True),
        sa.Column('claim_status', sa.String(length=20), nullable=False),
        sa.Column('claim_date', sa.DateTime(), nullable=True),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['lab_test_id'], ['lab_tests.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_claims_id'), 'claims', ['id'], unique=False)
    
    # Create godown_master table
    op.create_table('godown_master',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('capacity', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(length=50), nullable=False),
        sa.Column('current_storage', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_godown_master_id'), 'godown_master', ['id'], unique=False)
    
    # Create unloading_entries table
    op.create_table('unloading_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('vehicle_entry_id', sa.Integer(), nullable=False),
        sa.Column('godown_id', sa.Integer(), nullable=False),
        sa.Column('gross_weight', sa.Float(), nullable=False),
        sa.Column('empty_vehicle_weight', sa.Float(), nullable=False),
        sa.Column('net_weight', sa.Float(), nullable=False),
        sa.Column('before_unloading_image', sa.String(length=500), nullable=True),
        sa.Column('after_unloading_image', sa.String(length=500), nullable=True),
        sa.Column('unloading_start_time', sa.DateTime(), nullable=True),
        sa.Column('unloading_end_time', sa.DateTime(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['vehicle_entry_id'], ['vehicle_entries.id'], ),
        sa.ForeignKeyConstraint(['godown_id'], ['godown_master.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_unloading_entries_id'), 'unloading_entries', ['id'], unique=False)
    
    # Create bins table
    op.create_table('bins',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('bin_number', sa.String(length=100), nullable=False),
        sa.Column('capacity', sa.Float(), nullable=False),
        sa.Column('current_quantity', sa.Float(), nullable=True),
        sa.Column('material_type', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('bin_number')
    )
    op.create_index(op.f('ix_bins_id'), 'bins', ['id'], unique=False)
    
    # Create magnets table
    op.create_table('magnets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_magnets_id'), 'magnets', ['id'], unique=False)
    
    # Create transfer_sessions table
    op.create_table('transfer_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('source_godown_id', sa.Integer(), nullable=False),
        sa.Column('destination_bin_id', sa.Integer(), nullable=False),
        sa.Column('magnet_id', sa.Integer(), nullable=True),
        sa.Column('start_timestamp', sa.DateTime(), nullable=False),
        sa.Column('stop_timestamp', sa.DateTime(), nullable=True),
        sa.Column('transferred_quantity', sa.Float(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('cleaning_interval_hours', sa.Integer(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['source_godown_id'], ['godown_master.id'], ),
        sa.ForeignKeyConstraint(['destination_bin_id'], ['bins.id'], ),
        sa.ForeignKeyConstraint(['magnet_id'], ['magnets.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_transfer_sessions_id'), 'transfer_sessions', ['id'], unique=False)
    
    # Create route_magnet_mappings table
    op.create_table('route_magnet_mappings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('magnet_id', sa.Integer(), nullable=False),
        sa.Column('source_godown_id', sa.Integer(), nullable=True),
        sa.Column('source_bin_id', sa.Integer(), nullable=True),
        sa.Column('destination_bin_id', sa.Integer(), nullable=False),
        sa.Column('cleaning_interval_hours', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['magnet_id'], ['magnets.id'], ),
        sa.ForeignKeyConstraint(['source_godown_id'], ['godown_master.id'], ),
        sa.ForeignKeyConstraint(['source_bin_id'], ['bins.id'], ),
        sa.ForeignKeyConstraint(['destination_bin_id'], ['bins.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_route_magnet_mappings_id'), 'route_magnet_mappings', ['id'], unique=False)
    
    # Create magnet_cleaning_records table
    op.create_table('magnet_cleaning_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('magnet_id', sa.Integer(), nullable=False),
        sa.Column('transfer_session_id', sa.Integer(), nullable=True),
        sa.Column('cleaning_timestamp', sa.DateTime(), nullable=False),
        sa.Column('before_cleaning_photo', sa.String(length=500), nullable=True),
        sa.Column('after_cleaning_photo', sa.String(length=500), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['magnet_id'], ['magnets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['transfer_session_id'], ['transfer_sessions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_magnet_cleaning_records_id'), 'magnet_cleaning_records', ['id'], unique=False)
    op.create_index(op.f('ix_magnet_cleaning_records_magnet_id'), 'magnet_cleaning_records', ['magnet_id'], unique=False)
    op.create_index(op.f('ix_magnet_cleaning_records_transfer_session_id'), 'magnet_cleaning_records', ['transfer_session_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_magnet_cleaning_records_transfer_session_id'), table_name='magnet_cleaning_records')
    op.drop_index(op.f('ix_magnet_cleaning_records_magnet_id'), table_name='magnet_cleaning_records')
    op.drop_index(op.f('ix_magnet_cleaning_records_id'), table_name='magnet_cleaning_records')
    op.drop_table('magnet_cleaning_records')
    op.drop_index(op.f('ix_route_magnet_mappings_id'), table_name='route_magnet_mappings')
    op.drop_table('route_magnet_mappings')
    op.drop_index(op.f('ix_transfer_sessions_id'), table_name='transfer_sessions')
    op.drop_table('transfer_sessions')
    op.drop_index(op.f('ix_magnets_id'), table_name='magnets')
    op.drop_table('magnets')
    op.drop_index(op.f('ix_bins_id'), table_name='bins')
    op.drop_table('bins')
    op.drop_index(op.f('ix_unloading_entries_id'), table_name='unloading_entries')
    op.drop_table('unloading_entries')
    op.drop_index(op.f('ix_godown_master_id'), table_name='godown_master')
    op.drop_table('godown_master')
    op.drop_index(op.f('ix_claims_id'), table_name='claims')
    op.drop_table('claims')
    op.drop_index(op.f('ix_lab_tests_id'), table_name='lab_tests')
    op.drop_table('lab_tests')
    op.drop_index(op.f('ix_vehicle_entries_id'), table_name='vehicle_entries')
    op.drop_table('vehicle_entries')
    op.drop_index(op.f('ix_suppliers_id'), table_name='suppliers')
    op.drop_table('suppliers')
