"""add_report_visibility_and_admin_action_types

Revision ID: c4e8a2f6b1d7
Revises: da0be9eec00d
Create Date: 2026-06-09 02:13:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c4e8a2f6b1d7'
down_revision: Union[str, Sequence[str], None] = 'da0be9eec00d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_NEW_ADMIN_ACTION_TYPES = (
    "MODERATION_DECIDE",
    "EVIDENCE_DECIDE",
    "EVIDENCE_SCAN",
    "REPORT_CREATE",
    "REPORT_UPDATE",
    "REPORT_DELETE",
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

    op.add_column(
        'reports',
        sa.Column(
            'visibility',
            sa.String(length=16),
            nullable=False,
            server_default='public',
        ),
    )
    op.alter_column('reports', 'visibility', server_default=None)
    op.add_column(
        'reports',
        sa.Column(
            'pinned',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('false'),
        ),
    )
    op.alter_column('reports', 'pinned', server_default=None)
    op.add_column(
        'reports',
        sa.Column(
            'featured',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('false'),
        ),
    )
    op.alter_column('reports', 'featured', server_default=None)


def downgrade() -> None:
    """Downgrade schema.

    Note: PostgreSQL cannot drop individual enum values without recreating the
    type, so the new admin_action_type members are intentionally left in place.
    """
    op.drop_column('reports', 'featured')
    op.drop_column('reports', 'pinned')
    op.drop_column('reports', 'visibility')
