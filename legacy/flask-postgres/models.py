from flask_sqlalchemy import SQLAlchemy
from datetime import date

db = SQLAlchemy()


class BlockModel(db.Model):
    __tablename__ = "blocks"

    id             = db.Column(db.Integer, primary_key=True)
    index          = db.Column(db.Integer, nullable=False, unique=True)
    hash           = db.Column(db.String(64), nullable=False)
    hash_precedent = db.Column(db.String(64), nullable=False)
    nonce          = db.Column(db.Integer, nullable=False, default=0)
    horodatage     = db.Column(db.Float, nullable=False)
    temps_minage   = db.Column(db.Float, default=0.0)
    transactions   = db.relationship(
        "TransactionModel", backref="block", lazy="joined",
        cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "index":           self.index,
            "hash":            self.hash,
            "hash_precedent":  self.hash_precedent,
            "nonce":           self.nonce,
            "horodatage":      self.horodatage,
            "temps_minage":    self.temps_minage,
            "nb_transactions": len(self.transactions),
            "transactions":    [tx.to_dict() for tx in self.transactions],
        }


class TransactionModel(db.Model):
    __tablename__ = "transactions"

    id           = db.Column(db.Integer, primary_key=True)
    block_id     = db.Column(db.Integer, db.ForeignKey("blocks.id"), nullable=False)
    expediteur   = db.Column(db.String(256), nullable=False)
    destinataire = db.Column(db.String(256), nullable=False)
    montant      = db.Column(db.Float, nullable=False)
    frais        = db.Column(db.Float, nullable=False)
    ville_dest   = db.Column(db.String(100), nullable=False)
    source_ville = db.Column(db.String(100), nullable=False)
    signature    = db.Column(db.String(64), nullable=False)
    horodatage   = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            "expediteur":   self.expediteur[:12] + "…",
            "destinataire": self.destinataire[:12] + "…",
            "montant":      self.montant,
            "frais":        self.frais,
            "ville_dest":   self.ville_dest,
            "source_ville": self.source_ville,
            "signature":    self.signature,
            "horodatage":   self.horodatage,
        }


class MNBCWallet(db.Model):
    __tablename__ = "mnbc_wallets"

    nif           = db.Column(db.String(9), primary_key=True)
    solde         = db.Column(db.Float, nullable=False, default=0.0)
    depenses_jour = db.Column(db.Float, nullable=False, default=0.0)
    ville         = db.Column(db.String(100), nullable=False)
    date_reset    = db.Column(db.Date, nullable=True)

    def reset_daily_if_needed(self):
        today = date.today()
        if self.date_reset != today:
            self.depenses_jour = 0.0
            self.date_reset = today

    def to_dict(self):
        return {
            "solde":         self.solde,
            "depenses_jour": self.depenses_jour,
            "ville":         self.ville,
        }


class MNBCTransfer(db.Model):
    __tablename__ = "mnbc_transfers"

    id         = db.Column(db.Integer, primary_key=True)
    nif_e      = db.Column(db.String(9), nullable=False)
    nif_r      = db.Column(db.String(9), nullable=False)
    montant    = db.Column(db.Float, nullable=False)
    motif      = db.Column(db.String(500), nullable=True)
    tx_hash    = db.Column(db.String(64), nullable=False)
    horodatage = db.Column(db.Float, nullable=False)
    ville_e    = db.Column(db.String(100))
    ville_r    = db.Column(db.String(100))

    def to_dict(self):
        return {
            "de":      self.nif_e,
            "vers":    self.nif_r,
            "montant": self.montant,
            "motif":   self.motif or "",
            "hash":    self.tx_hash,
            "ts":      self.horodatage,
            "ville_e": self.ville_e,
            "ville_r": self.ville_r,
        }


class AMLEvent(db.Model):
    __tablename__ = "aml_events"

    id         = db.Column(db.Integer, primary_key=True)
    nif        = db.Column(db.String(9), nullable=False)
    montant    = db.Column(db.Float, nullable=False)
    horodatage = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            "nif":     self.nif,
            "montant": self.montant,
            "ts":      self.horodatage,
        }
