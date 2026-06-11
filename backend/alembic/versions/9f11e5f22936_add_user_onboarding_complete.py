"""add_user_onboarding_complete

Revision ID: 9f11e5f22936
Revises: e76e3ebac3b7
Create Date: 2026-06-11 15:19:38.653980

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9f11e5f22936'
down_revision: Union[str, Sequence[str], None] = 'e76e3ebac3b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('onboarding_complete', sa.Boolean(), server_default='false', nullable=False),
    )


def downgrade() -> None:
    op.drop_column('users', 'onboarding_complete')
