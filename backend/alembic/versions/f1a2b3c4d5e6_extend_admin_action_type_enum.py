"""extend_admin_action_type_enum

Revision ID: f1a2b3c4d5e6
Revises: c4e8a2f6b1d7
Create Date: 2026-06-09 13:40:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'c4e8a2f6b1d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_NEW_ADMIN_ACTION_TYPES = (
    "USER_UPDATE",
    "USER_DELETE",
    "ACCOUNT_CREATE",
    "ACCOUNT_UPDATE",
    "ACCOUNT_DELETE",
    "SETTINGS_UPDATE",
    "OWNERSHIP_ASSIGN",
    "OWNERSHIP_REVOKE",
    "SCORE_REPLAY",
)


def upgrade() -> None:
    """Upgrade schema."""
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction block, so the
    # enum additions are wrapped in an autocommit block.
    with op.get_context().autocommit_block():
        for value in _NEW_ADMIN_ACTION_TYPES:
            op.execute(
                f"ALTER TYPE admin_action_type ADD VALUE IF NOT EXISTS '{value}'"
            )


def downgrade() -> None:
    """Downgrade schema.

    Note: PostgreSQL cannot drop individual enum values without recreating the
    type, so the new admin_action_type members are intentionally left in place.
    """
    pass
