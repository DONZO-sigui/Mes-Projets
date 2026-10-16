"""end of migration chain (no-op checkpoint)

Revision ID: 004
Revises: 003
Create Date: 2026-09-25

Fin de la chaîne linéaire :
    0001 → 024b0ce2799d → 002 → 003 → 004
"""
revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
