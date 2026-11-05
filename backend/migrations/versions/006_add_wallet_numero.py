"""add wallet numero (9-digit unique identifier)

Revision ID: 006
Revises: 005
Create Date: 2026-11-05

Ajouts :
    wallets.numero  — Numéro de wallet à 9 chiffres, unique, généré à l'inscription
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ajout de la colonne (nullable d'abord pour les wallets existants)
    op.add_column(
        "wallets",
        sa.Column("numero", sa.String(length=9), nullable=True),
    )

    # Remplissage des wallets existants avec un numéro unique
    op.execute("""
        UPDATE wallets
        SET numero = LPAD(
            CAST(
                100000000 + (
                    abs(('x' || substring(id::text, 1, 8))::bit(32)::bigint)
                    % 900000000
                ) AS TEXT
            ),
            9, '0'
        )
        WHERE numero IS NULL
    """)

    # Rendre la colonne NOT NULL et ajouter les contraintes
    op.alter_column("wallets", "numero", nullable=False)
    op.create_unique_constraint("uq_wallets_numero", "wallets", ["numero"])
    op.create_index("ix_wallets_numero", "wallets", ["numero"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_wallets_numero", table_name="wallets")
    op.drop_constraint("uq_wallets_numero", "wallets", type_="unique")
    op.drop_column("wallets", "numero")
