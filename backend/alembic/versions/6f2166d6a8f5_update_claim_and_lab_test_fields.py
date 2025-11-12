"""update_claim_and_lab_test_fields

Revision ID: 6f2166d6a8f5
Revises: b345b4c06510
Create Date: 2025-11-12 11:36:01.468357

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6f2166d6a8f5'
down_revision: Union[str, Sequence[str], None] = 'b345b4c06510'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add raise_claim to lab_tests table
    op.add_column('lab_tests', sa.Column('raise_claim', sa.Integer(), server_default='0', nullable=True))
    
    # Add new columns to claims table
    op.add_column('claims', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('claims', sa.Column('claim_type', sa.String(length=20), nullable=True))
    op.add_column('claims', sa.Column('claim_amount', sa.Float(), nullable=True))
    
    # Migrate existing data: combine issue_found and remarks into description
    op.execute("""
        UPDATE claims 
        SET description = CASE 
            WHEN remarks IS NOT NULL AND remarks != '' THEN issue_found || E'\n\n' || remarks
            ELSE issue_found
        END
        WHERE issue_found IS NOT NULL
    """)
    
    # Make description NOT NULL after data migration
    op.alter_column('claims', 'description', nullable=False)
    
    # Drop old columns
    op.drop_column('claims', 'issue_found')
    op.drop_column('claims', 'category_detected')
    op.drop_column('claims', 'remarks')


def downgrade() -> None:
    """Downgrade schema."""
    # Add back old columns
    op.add_column('claims', sa.Column('issue_found', sa.Text(), nullable=True))
    op.add_column('claims', sa.Column('category_detected', sa.String(length=100), nullable=True))
    op.add_column('claims', sa.Column('remarks', sa.Text(), nullable=True))
    
    # Migrate description back to issue_found (simple migration, may lose some data)
    op.execute("UPDATE claims SET issue_found = description")
    op.alter_column('claims', 'issue_found', nullable=False)
    
    # Drop new columns
    op.drop_column('claims', 'claim_amount')
    op.drop_column('claims', 'claim_type')
    op.drop_column('claims', 'description')
    
    # Drop raise_claim from lab_tests
    op.drop_column('lab_tests', 'raise_claim')
