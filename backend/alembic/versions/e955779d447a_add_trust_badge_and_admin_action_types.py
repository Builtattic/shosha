"""add_trust_badge_and_admin_action_types

Revision ID: e955779d447a
Revises: a70cf48eea82
Create Date: 2026-06-10 01:34:43.215501

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e955779d447a'
down_revision: Union[str, Sequence[str], None] = 'a70cf48eea82'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_NEW_ADMIN_ACTION_TYPES = (
    "AUDIT_RUN",
    "AUDIT_DECIDE",
    "ABUSE_DISMISS",
    "TRUST_BADGE_DECIDE",
    "DELETION_REQUEST_DECIDE",
    "ISSUE_STATUS_UPDATE",
)


def upgrade() -> None:
    """Upgrade schema."""
    with op.get_context().autocommit_block():
        for value in _NEW_ADMIN_ACTION_TYPES:
            op.execute(
                f"ALTER TYPE admin_action_type ADD VALUE IF NOT EXISTS '{value}'"
            )

    op.add_column('users', sa.Column('trust_badge', sa.Boolean(), nullable=True))
    op.add_column(
        'users',
        sa.Column('trust_badge_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        'users',
        sa.Column(
            'trust_badge_pending',
            sa.Boolean(),
            nullable=True,
            server_default='false',
        ),
    )
    op.add_column(
        'users',
        sa.Column(
            'trust_badge_submitted_at',
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        'users',
        sa.Column('trust_badge_selfie_url', sa.String(1024), nullable=True),
    )
    op.add_column(
        'users',
        sa.Column('trust_badge_doc_url', sa.String(1024), nullable=True),
    )
    op.add_column(
        'users',
        sa.Column('trust_badge_doc_type', sa.String(32), nullable=True),
    )
    op.add_column(
        'users',
        sa.Column(
            'trust_badge_rejected_at',
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.add_column(
        'users',
        sa.Column('trust_badge_rejection_reason', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema.

    Note: PostgreSQL cannot drop individual enum values without recreating the
    type, so the new admin_action_type members are intentionally left in place.
    """
    op.drop_column('users', 'trust_badge_rejection_reason')
    op.drop_column('users', 'trust_badge_rejected_at')
    op.drop_column('users', 'trust_badge_doc_type')
    op.drop_column('users', 'trust_badge_doc_url')
    op.drop_column('users', 'trust_badge_selfie_url')
    op.drop_column('users', 'trust_badge_submitted_at')
    op.drop_column('users', 'trust_badge_pending')
    op.drop_column('users', 'trust_badge_at')
    op.drop_column('users', 'trust_badge')
