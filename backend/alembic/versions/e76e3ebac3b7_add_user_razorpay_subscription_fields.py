"""add_user_razorpay_subscription_fields

Revision ID: e76e3ebac3b7
Revises: 31185089f24f
Create Date: 2026-06-11 12:05:59.782353

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e76e3ebac3b7'
down_revision: Union[str, Sequence[str], None] = '31185089f24f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('trust_badge_subscription_id', sa.String(length=128), nullable=True))
    op.add_column('users', sa.Column('trust_badge_payment_id', sa.String(length=128), nullable=True))
    op.add_column('users', sa.Column('trust_badge_subscription_status', sa.String(length=32), nullable=True))
    op.add_column('users', sa.Column('trust_badge_subscription_currency', sa.String(length=8), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'trust_badge_subscription_currency')
    op.drop_column('users', 'trust_badge_subscription_status')
    op.drop_column('users', 'trust_badge_payment_id')
    op.drop_column('users', 'trust_badge_subscription_id')
