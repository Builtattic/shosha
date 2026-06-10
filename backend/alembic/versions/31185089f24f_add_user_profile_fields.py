"""add_user_profile_fields

Revision ID: 31185089f24f
Revises: 6ef429d4f408
Create Date: 2026-06-10 12:07:11.486688

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '31185089f24f'
down_revision: Union[str, Sequence[str], None] = '6ef429d4f408'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('bio', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('headline', sa.String(length=128), nullable=True))
    op.add_column('users', sa.Column('city', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('website_url', sa.String(length=1024), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'website_url')
    op.drop_column('users', 'city')
    op.drop_column('users', 'headline')
    op.drop_column('users', 'bio')
