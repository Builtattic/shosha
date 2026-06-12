"""add_account_momentum_fields

Revision ID: c3a8f1d2e4b5
Revises: b7d2f4a9c1e3
Create Date: 2026-06-12 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c3a8f1d2e4b5"
down_revision: Union[str, Sequence[str], None] = "b7d2f4a9c1e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("accounts", sa.Column("w1_delta", sa.Float(), nullable=True))
    op.add_column("accounts", sa.Column("w2_delta", sa.Float(), nullable=True))
    op.add_column("accounts", sa.Column("w3_delta", sa.Float(), nullable=True))
    op.add_column(
        "accounts",
        sa.Column("momentum_updated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("accounts", "momentum_updated_at")
    op.drop_column("accounts", "w3_delta")
    op.drop_column("accounts", "w2_delta")
    op.drop_column("accounts", "w1_delta")
