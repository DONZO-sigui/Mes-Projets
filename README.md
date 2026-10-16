# GNF-Token — Plateforme de transfert monétaire Guinée ↔ Diaspora

> **Démonstration technique uniquement.**
> Toute utilisation financière réelle nécessite une validation juridique, réglementaire,
> de sécurité et opérationnelle appropriée. Ce projet ne prétend pas être conforme
> automatiquement à la réglementation de la BCRG ni à d'autres réglementations financières.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 19 + Vite 8 + Bootstrap 5 |
| Backend | FastAPI 0.115 + Pydantic v2 |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic |
| Base de données | PostgreSQL 18 |
| Argent | `NUMERIC(18,4)` — jamais `float` |
| Mobile futur | PWA + Capacitor |

---

## Prérequis

- Python 3.12
- Node.js 22
- PostgreSQL 18 (local, port 5432)
- Base `gnf_db` créée par l'administrateur PostgreSQL

---

## 1. Configuration PostgreSQL (action manuelle)

Connectez-vous en tant qu'administrateur PostgreSQL puis exécutez :

```sql
CREATE USER gnftoken WITH PASSWORD 'gnftoken2024';
GRANT ALL PRIVILEGES ON DATABASE gnf_db TO gnftoken;
\c gnf_db
GRANT ALL ON SCHEMA public TO gnftoken;
```

Puis mettez à jour `backend/.env` avec le mot de passe réel.

---

## 2. Backend

```bash
cd backend

# Activer le virtualenv
.\.venv\Scripts\Activate.ps1   # Windows PowerShell
# source .venv/bin/activate    # Linux/macOS

# Copier et configurer les variables d'environnement
copy .env.example .env
# Éditer .env avec DATABASE_URL, SECRET_KEY, JWT_SECRET_KEY

# Appliquer les migrations
alembic upgrade head

# Démarrer le serveur
uvicorn app.main:app --reload

# Tests
python -m pytest
```

Serveur disponible sur : http://127.0.0.1:8000
Documentation Swagger : http://127.0.0.1:8000/docs

---

## 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Application disponible sur : http://localhost:5173

---

## 4. Structure du projet

```
gnf_dashboard/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/          config.py, security.py
│   │   ├── db/            base.py, session.py
│   │   ├── models/        wallet, transaction, ledger, blockchain, mnbc
│   │   ├── schemas/       Pydantic schemas
│   │   ├── repositories/  accès données
│   │   ├── services/      logique métier
│   │   └── api/v1/        routes FastAPI
│   ├── migrations/        Alembic
│   └── tests/             pytest
├── frontend/
│   └── src/
│       ├── api/           client Axios
│       ├── layouts/       MainLayout Bootstrap
│       ├── pages/         Dashboard, SendMoney, Chain, MNBC
│       └── routes/        React Router v6
├── docs/                  architecture.md
└── legacy/                ancien code Flask archivé
```

---

## 5. Architecture financière

```
React → FastAPI /api/v1 → Service → Repository → SQLAlchemy → PostgreSQL
```

- PostgreSQL = source de vérité financière
- `NUMERIC(18,4)` pour tous les montants
- Double-entry ledger (DEBIT + CREDIT par transaction)
- Idempotency key pour éviter les doubles transferts
- `SELECT FOR UPDATE` pour le verrouillage (ÉTAPE 5)
- Aucun endpoint de reset ou suppression de données financières

---

## 6. Historique des étapes

| Étape | Contenu | Statut |
|---|---|---|
| ÉTAPE 1 | Audit complet du projet legacy | ✅ |
| ÉTAPE 2 | Architecture : FastAPI + React + Vite | ✅ |
| ÉTAPE 3 | PostgreSQL + SQLAlchemy + Modèles + Alembic | ✅ |
| ÉTAPE 4 | Authentification + JWT + RBAC | — |
| ÉTAPE 5 | Transferts + Ledger + Blockchain | — |
| ÉTAPE 6 | PWA + Capacitor (mobile) | — |
