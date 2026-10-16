"""add_authentication

Revision ID: 024b0ce2799d
Revises: 0001
Create Date: 2026-09-23 18:05:33.296940

Ajouts :
    users            — Comptes utilisateurs (Argon2id, RBAC, statut)
    refresh_tokens   — Tokens JWT révocables (SHA-256, rotation)
    wallets.user_id  — FK optionnelle vers users (SET NULL on delete)

Données legacy préservées :
    legacy_users / legacy_wallets / legacy_transactions /
    legacy_blocks / legacy_mnbc_historique / legacy_aml_journal
    → jamais touchées par cette migration
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '024b0ce2799d'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users ─────────────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('first_name', sa.String(length=100), nullable=False),
        sa.Column('last_name', sa.String(length=100), nullable=False),
        sa.Column('role', sa.String(length=20), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('is_email_verified', sa.Boolean(), nullable=False),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.CheckConstraint(
            "role IN ('USER','ADMIN')",
            name='ck_users_role',
        ),
        sa.CheckConstraint(
            "status IN ('ACTIVE','SUSPENDED','DISABLED')",
            name='ck_users_status',
        ),
        sa.PrimaryKeyConstraint('id', name='pk_users'),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # ── refresh_tokens ────────────────────────────────────────────
    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('jti', sa.String(length=36), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ['user_id'],
            ['users.id'],
            name='fk_refresh_tokens_user_id_users',
            ondelete='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id', name='pk_refresh_tokens'),
    )
    op.create_index(
        'ix_refresh_tokens_expires_at', 'refresh_tokens', ['expires_at'],
        unique=False,
    )
    op.create_index(
        'ix_refresh_tokens_jti', 'refresh_tokens', ['jti'], unique=True,
    )
    op.create_index(
        'ix_refresh_tokens_user_id', 'refresh_tokens', ['user_id'],
        unique=False,
    )

    # ── wallets.user_id ───────────────────────────────────────────
    # Lien optionnel wallet ↔ user (SET NULL si user supprimé)
    op.add_column('wallets', sa.Column('user_id', sa.Uuid(), nullable=True))
    op.create_index(
        'ix_wallets_user_id', 'wallets', ['user_id'], unique=False,
    )
    op.create_foreign_key(
        'fk_wallets_user_id_users',
        'wallets', 'users',
        ['user_id'], ['id'],
        ondelete='SET NULL',
    )

    # Note : les tables legacy_* sont volontairement préservées.
    # Note : les contraintes uq_wallets_nif, uq_mnbc_reserves_devise,
    #        uq_transactions_* et ix_blocks_hash (unique) sont inchangées.


def downgrade() -> None:
    op.drop_constraint('fk_wallets_user_id_users', 'wallets', type_='foreignkey')
    op.drop_index('ix_wallets_user_id', table_name='wallets')
    op.drop_column('wallets', 'user_id')

    op.drop_index('ix_refresh_tokens_user_id', table_name='refresh_tokens')
    op.drop_index('ix_refresh_tokens_jti', table_name='refresh_tokens')
    op.drop_index('ix_refresh_tokens_expires_at', table_name='refresh_tokens')
    op.drop_table('refresh_tokens')

    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
