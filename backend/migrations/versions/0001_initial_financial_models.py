"""initial financial models

Revision ID: 0001
Revises:
Create Date: 2026-09-23

Tables créées :
    wallets          — Portefeuilles (NIF, solde NUMERIC, statut)
    transactions     — Transferts (référence unique, idempotency_key, statuts)
    ledger_entries   — Journal double-entry (DEBIT/CREDIT par transaction)
    blocks           — Blockchain de traçabilité (hash, previous_hash, PoW)
    mnbc_reserves    — Réserve MNBC par devise (NUMERIC, taux)
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── wallets ──────────────────────────────────────────────────
    op.create_table(
        "wallets",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("nif", sa.String(length=20), nullable=False),
        sa.Column("nom", sa.String(length=100), nullable=False),
        sa.Column("prenom", sa.String(length=100), nullable=False),
        sa.Column("ville", sa.String(length=100), nullable=True),
        sa.Column("devise", sa.String(length=3), nullable=False, server_default="GNF"),
        sa.Column(
            "solde",
            sa.Numeric(precision=18, scale=4),
            nullable=False,
            server_default="0.0000",
        ),
        sa.Column("statut", sa.String(length=20), nullable=False, server_default="ACTIVE"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("devise IN ('GNF','EUR','USD')", name="ck_wallets_devise"),
        sa.CheckConstraint(
            "statut IN ('ACTIVE','SUSPENDED','CLOSED')", name="ck_wallets_statut"
        ),
        sa.CheckConstraint("solde >= 0", name="ck_wallets_solde_positive"),
        sa.PrimaryKeyConstraint("id", name="pk_wallets"),
        sa.UniqueConstraint("nif", name="uq_wallets_nif"),
    )
    op.create_index("ix_wallets_nif", "wallets", ["nif"], unique=True)

    # ── transactions ─────────────────────────────────────────────
    op.create_table(
        "transactions",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("reference", sa.String(length=40), nullable=False),
        sa.Column("sender_wallet_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("receiver_wallet_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("montant", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("devise", sa.String(length=3), nullable=False, server_default="GNF"),
        sa.Column(
            "frais",
            sa.Numeric(precision=18, scale=4),
            nullable=False,
            server_default="0.0000",
        ),
        sa.Column("montant_total", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("statut", sa.String(length=20), nullable=False, server_default="PENDING"),
        sa.Column("motif", sa.String(length=250), nullable=True),
        sa.Column("idempotency_key", sa.String(length=100), nullable=False),
        sa.Column("metadata", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "statut IN ('PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED','REVERSED')",
            name="ck_transactions_statut",
        ),
        sa.CheckConstraint("devise IN ('GNF','EUR','USD')", name="ck_transactions_devise"),
        sa.CheckConstraint("montant > 0", name="ck_transactions_montant_positive"),
        sa.CheckConstraint("frais >= 0", name="ck_transactions_frais_positive"),
        sa.CheckConstraint(
            "sender_wallet_id != receiver_wallet_id",
            name="ck_transactions_no_self_transfer",
        ),
        sa.ForeignKeyConstraint(
            ["sender_wallet_id"],
            ["wallets.id"],
            name="fk_transactions_sender_wallet_id_wallets",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["receiver_wallet_id"],
            ["wallets.id"],
            name="fk_transactions_receiver_wallet_id_wallets",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_transactions"),
        sa.UniqueConstraint("reference", name="uq_transactions_reference"),
        sa.UniqueConstraint("idempotency_key", name="uq_transactions_idempotency_key"),
    )
    op.create_index("ix_transactions_reference", "transactions", ["reference"], unique=True)
    op.create_index("ix_transactions_idempotency_key", "transactions", ["idempotency_key"], unique=True)
    op.create_index("ix_transactions_sender_wallet_id", "transactions", ["sender_wallet_id"])
    op.create_index("ix_transactions_receiver_wallet_id", "transactions", ["receiver_wallet_id"])
    op.create_index("ix_transactions_statut", "transactions", ["statut"])
    op.create_index("ix_transactions_created_at", "transactions", ["created_at"])

    # ── ledger_entries ───────────────────────────────────────────
    op.create_table(
        "ledger_entries",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("transaction_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("wallet_id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("type_mouvement", sa.String(length=10), nullable=False),
        sa.Column("montant", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("devise", sa.String(length=3), nullable=False, server_default="GNF"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "type_mouvement IN ('DEBIT','CREDIT')",
            name="ck_ledger_entries_type_mouvement",
        ),
        sa.CheckConstraint("devise IN ('GNF','EUR','USD')", name="ck_ledger_entries_devise"),
        sa.CheckConstraint("montant > 0", name="ck_ledger_entries_montant_positive"),
        sa.ForeignKeyConstraint(
            ["transaction_id"],
            ["transactions.id"],
            name="fk_ledger_entries_transaction_id_transactions",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["wallet_id"],
            ["wallets.id"],
            name="fk_ledger_entries_wallet_id_wallets",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_ledger_entries"),
    )
    op.create_index("ix_ledger_entries_transaction_id", "ledger_entries", ["transaction_id"])
    op.create_index("ix_ledger_entries_wallet_id", "ledger_entries", ["wallet_id"])
    op.create_index("ix_ledger_entries_created_at", "ledger_entries", ["created_at"])

    # ── blocks ───────────────────────────────────────────────────
    op.create_table(
        "blocks",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("index", sa.Integer(), nullable=False),
        sa.Column("hash", sa.String(length=64), nullable=False),
        sa.Column("previous_hash", sa.String(length=64), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("nonce", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("difficulty", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("data", postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column("transaction_id", sa.Uuid(as_uuid=True), nullable=True),
        sa.Column("statut", sa.String(length=10), nullable=False, server_default="PENDING"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("difficulty >= 0", name="ck_blocks_difficulty_positive"),
        sa.CheckConstraint("nonce >= 0", name="ck_blocks_nonce_positive"),
        sa.CheckConstraint(
            "statut IN ('VALID','INVALID','PENDING')", name="ck_blocks_statut"
        ),
        sa.ForeignKeyConstraint(
            ["transaction_id"],
            ["transactions.id"],
            name="fk_blocks_transaction_id_transactions",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_blocks"),
        sa.UniqueConstraint("hash", name="uq_blocks_hash"),
    )
    op.create_index("ix_blocks_index", "blocks", ["index"])
    op.create_index("ix_blocks_hash", "blocks", ["hash"], unique=True)
    op.create_index("ix_blocks_previous_hash", "blocks", ["previous_hash"])
    op.create_index("ix_blocks_transaction_id", "blocks", ["transaction_id"])

    # ── mnbc_reserves ────────────────────────────────────────────
    op.create_table(
        "mnbc_reserves",
        sa.Column("id", sa.Uuid(as_uuid=True), nullable=False),
        sa.Column("devise", sa.String(length=3), nullable=False),
        sa.Column(
            "reserve",
            sa.Numeric(precision=18, scale=4),
            nullable=False,
            server_default="0.0000",
        ),
        sa.Column(
            "taux",
            sa.Numeric(precision=18, scale=6),
            nullable=False,
            server_default="1.000000",
        ),
        sa.Column("statut", sa.String(length=20), nullable=False, server_default="ACTIVE"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("devise IN ('GNF','EUR','USD')", name="ck_mnbc_reserves_devise"),
        sa.CheckConstraint(
            "statut IN ('ACTIVE','SUSPENDED')", name="ck_mnbc_reserves_statut"
        ),
        sa.CheckConstraint("reserve >= 0", name="ck_mnbc_reserves_reserve_positive"),
        sa.CheckConstraint("taux > 0", name="ck_mnbc_reserves_taux_positive"),
        sa.PrimaryKeyConstraint("id", name="pk_mnbc_reserves"),
        sa.UniqueConstraint("devise", name="uq_mnbc_reserves_devise"),
    )
    op.create_index("ix_mnbc_reserves_devise", "mnbc_reserves", ["devise"], unique=True)


def downgrade() -> None:
    op.drop_table("mnbc_reserves")
    op.drop_table("blocks")
    op.drop_table("ledger_entries")
    op.drop_table("transactions")
    op.drop_table("wallets")
