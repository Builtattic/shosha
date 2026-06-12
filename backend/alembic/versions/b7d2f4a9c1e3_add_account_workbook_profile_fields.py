"""add_account_workbook_profile_fields

Revision ID: b7d2f4a9c1e3
Revises: 02868f72cba7
Create Date: 2026-06-12 09:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7d2f4a9c1e3'
down_revision: Union[str, Sequence[str], None] = '02868f72cba7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('accounts', sa.Column('role', sa.String(length=64), nullable=True))
    op.add_column('accounts', sa.Column('reach', sa.String(length=32), nullable=True))
    op.add_column('accounts', sa.Column('education_workbook', sa.String(length=64), nullable=True))
    op.add_column('accounts', sa.Column('specialized_field_workbook', sa.String(length=64), nullable=True))
    op.add_column('accounts', sa.Column('management_workbook', sa.String(length=64), nullable=True))
    op.add_column('accounts', sa.Column('disability', sa.String(length=32), nullable=True))
    op.add_column('accounts', sa.Column('lifestyle', sa.String(length=32), nullable=True))
    op.add_column('accounts', sa.Column('region', sa.String(length=64), nullable=True))
    op.add_column(
        'accounts',
        sa.Column('opposed_posts', sa.Integer(), nullable=False, server_default='0'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('accounts', 'opposed_posts')
    op.drop_column('accounts', 'region')
    op.drop_column('accounts', 'lifestyle')
    op.drop_column('accounts', 'disability')
    op.drop_column('accounts', 'management_workbook')
    op.drop_column('accounts', 'specialized_field_workbook')
    op.drop_column('accounts', 'education_workbook')
    op.drop_column('accounts', 'reach')
    op.drop_column('accounts', 'role')
