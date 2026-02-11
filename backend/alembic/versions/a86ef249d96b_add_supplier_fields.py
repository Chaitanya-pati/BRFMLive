"""add_supplier_fields

Revision ID: a86ef249d96b
Revises: 109aef2461c4
Create Date: 2025-11-11 10:48:10.359809

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a86ef249d96b'
down_revision: Union[str, Sequence[str], None] = '109aef2461c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('suppliers')]
    
    if 'email' not in columns:
        op.add_column('suppliers', sa.Column('email', sa.String(length=255), nullable=True))
    if 'street' not in columns:
        op.add_column('suppliers', sa.Column('street', sa.String(length=255), nullable=True))
    if 'district' not in columns:
        op.add_column('suppliers', sa.Column('district', sa.String(length=100), nullable=True))
    if 'zip_code' not in columns:
        op.add_column('suppliers', sa.Column('zip_code', sa.String(length=20), nullable=True))
    if 'gstin' not in columns:
        op.add_column('suppliers', sa.Column('gstin', sa.String(length=15), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('suppliers', 'gstin')
    op.drop_column('suppliers', 'zip_code')
    op.drop_column('suppliers', 'district')
    op.drop_column('suppliers', 'street')
    op.drop_column('suppliers', 'email')
