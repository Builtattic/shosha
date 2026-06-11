"""add_user_onboarding_profile_fields

Revision ID: 02868f72cba7
Revises: 9f11e5f22936
Create Date: 2026-06-12 01:39:24.165253

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '02868f72cba7'
down_revision: Union[str, Sequence[str], None] = '9f11e5f22936'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('phone', sa.String(length=32), nullable=True))
    op.add_column('users', sa.Column('dob', sa.String(length=16), nullable=True))
    op.add_column('users', sa.Column('country', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('region', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('quote', sa.String(length=280), nullable=True))
    op.add_column('users', sa.Column('occupation_role', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('network_size', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('education', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('specialized_field', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('manages_money_people_system', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('physical_intellectual_limitations', sa.String(length=64), nullable=True))
    op.add_column('users', sa.Column('ig_url', sa.String(length=512), nullable=True))
    op.add_column('users', sa.Column('tiktok_url', sa.String(length=512), nullable=True))
    op.add_column('users', sa.Column('x_url', sa.String(length=512), nullable=True))
    op.add_column('users', sa.Column('linkedin_url', sa.String(length=512), nullable=True))
    op.add_column('users', sa.Column('reddit_url', sa.String(length=512), nullable=True))
    op.add_column('users', sa.Column('yt_url', sa.String(length=512), nullable=True))
    op.add_column('users', sa.Column('fb_url', sa.String(length=512), nullable=True))
    op.add_column('users', sa.Column('snapchat_url', sa.String(length=512), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'snapchat_url')
    op.drop_column('users', 'fb_url')
    op.drop_column('users', 'yt_url')
    op.drop_column('users', 'reddit_url')
    op.drop_column('users', 'linkedin_url')
    op.drop_column('users', 'x_url')
    op.drop_column('users', 'tiktok_url')
    op.drop_column('users', 'ig_url')
    op.drop_column('users', 'physical_intellectual_limitations')
    op.drop_column('users', 'manages_money_people_system')
    op.drop_column('users', 'specialized_field')
    op.drop_column('users', 'education')
    op.drop_column('users', 'network_size')
    op.drop_column('users', 'occupation_role')
    op.drop_column('users', 'quote')
    op.drop_column('users', 'region')
    op.drop_column('users', 'country')
    op.drop_column('users', 'dob')
    op.drop_column('users', 'phone')
