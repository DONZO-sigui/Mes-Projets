# Architecture GNF-Token — ÉTAPE 3

## Source de vérité financière

```
PostgreSQL (gnf_db)
    ├── wallets          → Portefeuilles (solde NUMERIC, pas Float)
    ├── transactions     → Transferts (référence unique, idempotency)
    ├── ledger_entries   → Journal double-entry (DEBIT/CREDIT)
    ├── blocks           → Blockchain de traçabilité
    └── mnbc_reserves    → Réserve MNBC par devise
```

**PostgreSQL est la seule source de vérité.**
Aucune donnée financière ne vit en mémoire Python globale.

## Ledger — Journal financier

Chaque Transaction génère exactement deux LedgerEntry :

```
Transaction COMPLETED
    ├── LedgerEntry DEBIT  → wallet source (solde diminue)
    └── LedgerEntry CREDIT → wallet destination (solde augmente)
```

Les écritures sont atomiques dans une transaction PostgreSQL.
Les transactions confirmées ne sont jamais supprimées — une `REVERSAL` crée
une transaction inverse.

## Blockchain

La blockchain sert à la **traçabilité** et à la démonstration du mécanisme PoW.
Elle n'est PAS la source de vérité financière.

Vérification PoW :
    hash[:difficulty] == "0" * difficulty

## Flux d'un transfert (ÉTAPE 5)

```
React Frontend
    ↓ POST /api/v1/transactions (avec Idempotency-Key header)
FastAPI route
    ↓
TransactionService
    ↓ BEGIN
    ↓ SELECT ... FROM wallets WHERE id=? FOR UPDATE  (verrouillage pessimiste)
    ↓ vérifier solde suffisant
    ↓ créer Transaction PENDING → PROCESSING → COMPLETED
    ↓ créer LedgerEntry DEBIT + CREDIT
    ↓ mettre à jour soldes (NUMERIC, pas Float)
    ↓ COMMIT
PostgreSQL
```

## Ce qui n'existe pas

- Aucun endpoint `/reset` ou `/drop`
- Aucun stockage financier en mémoire Python
- Aucun `float` dans les montants financiers
- Pas de connexion React → PostgreSQL directe
