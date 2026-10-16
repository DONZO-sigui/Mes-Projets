"""add beneficiaries table

Revision ID: 002
Revises:
Create Date: 2026-09-25

"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "024b0ce2799d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "beneficiaries",
        sa.Column(
            "id",
            sa.Uuid(as_uuid=True),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "wallet_id",
            sa.Uuid(as_uuid=True),
            sa.ForeignKey("wallets.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("nickname", sa.String(50), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_beneficiaries_user_id", "beneficiaries", ["user_id"]
    )
    op.create_index(
        "ix_beneficiaries_wallet_id", "beneficiaries", ["wallet_id"]
    )
    op.create_unique_constraint(
        "uq_beneficiaries_user_wallet",
        "beneficiaries",
        ["user_id", "wallet_id"],
    )


def downgrade() -> None:
    op.drop_table("beneficiaries")
