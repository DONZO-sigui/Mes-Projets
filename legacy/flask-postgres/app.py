"""
GNF-Token Dashboard — Flask + PostgreSQL Backend
"""
import hashlib, time, json, random, os
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from models import db, BlockModel, TransactionModel, MNBCWallet, MNBCTransfer, AMLEvent

load_dotenv()

app = Flask(__name__, template_folder="../templates", static_folder="../static")
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
    "DATABASE_URL", "postgresql://postgres:password@localhost:5432/gnf_dashboard"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-key-change-in-prod")

_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:8081").split(",")
CORS(app, origins=_origins)

db.init_app(app)

# ─── Constantes ────────────────────────────────────────────────────────────────

DIFFICULTE  = 3
PLAFOND_AML = 10_000

WALLETS_DIASPORA = {v: hashlib.sha256(f"{v}42".encode()).hexdigest()
                    for v in ["Paris", "New York", "Dubai", "Lyon", "Londres"]}
WALLETS_GUINEE   = {v: hashlib.sha256(f"{v}42".encode()).hexdigest()
                    for v in ["Conakry", "Kindia", "Kankan", "Labé", "N'Zérékoré"]}

# ─── Fonctions blockchain ──────────────────────────────────────────────────────

def _calculer_hash(index, hash_precedent, horodatage, transactions_data, nonce):
    contenu = json.dumps({
        "index": index, "prev_hash": hash_precedent,
        "timestamp": horodatage, "transactions": transactions_data, "nonce": nonce,
    }, sort_keys=True)
    return hashlib.sha256(hashlib.sha256(contenu.encode()).hexdigest().encode()).hexdigest()


def _miner(index, hash_precedent, transactions_data):
    horodatage = time.time()
    nonce = 0
    cible = "0" * DIFFICULTE
    debut = time.time()
    while True:
        h = _calculer_hash(index, hash_precedent, horodatage, transactions_data, nonce)
        if h.startswith(cible):
            return h, nonce, horodatage, round(time.time() - debut, 3)
        nonce += 1


def _get_last_block():
    return BlockModel.query.order_by(BlockModel.index.desc()).first()


def _est_chaine_valide():
    blocs = BlockModel.query.order_by(BlockModel.index.asc()).all()
    for i in range(1, len(blocs)):
        b = blocs[i]
        tx_data = [tx.to_dict() for tx in b.transactions]
        h = _calculer_hash(b.index, b.hash_precedent, b.horodatage, tx_data, b.nonce)
        if b.hash != h or b.hash_precedent != blocs[i - 1].hash:
            return False
    return True


def _signer(expediteur, destinataire, montant, ts):
    return hashlib.sha256(f"{expediteur}{destinataire}{montant}{ts}".encode()).hexdigest()[:16]


def _init_db():
    db.create_all()
    if BlockModel.query.count() == 0:
        h, nonce, ts, _ = _miner(0, "0" * 64, [])
        db.session.add(BlockModel(
            index=0, hash=h, hash_precedent="0" * 64,
            nonce=nonce, horodatage=ts, temps_minage=0
        ))
        db.session.commit()
    if MNBCWallet.query.count() == 0:
        for nif, solde, ville in [
            ("100234567", 15000, "Conakry"),
            ("200345678",  5500, "Kindia"),
            ("300456789", 12000, "Kankan"),
            ("400567890",  3000, "Labé"),
            ("500678901",  7200, "N'Zérékoré"),
        ]:
            db.session.add(MNBCWallet(nif=nif, solde=solde, ville=ville))
        db.session.commit()

# ─── Routes web (dashboard classique) ─────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")

# ─── API stats & chaîne ────────────────────────────────────────────────────────

@app.route("/api/stats")
def api_stats():
    blocs    = BlockModel.query.filter(BlockModel.index > 0).all()
    toutes   = [tx for b in blocs for tx in b.transactions]
    if not toutes:
        return jsonify({})
    volume   = sum(t.montant for t in toutes)
    frais_bc = sum(t.frais   for t in toutes)
    repartition = {}
    for tx in toutes:
        repartition[tx.ville_dest] = repartition.get(tx.ville_dest, 0) + tx.montant
    return jsonify({
        "nb_blocs":         len(blocs),
        "nb_transactions":  len(toutes),
        "volume_total":     round(volume, 2),
        "frais_blockchain": round(frais_bc, 4),
        "frais_mtn":        round(volume * 0.035, 2),
        "frais_wu":         round(volume * 0.08, 2),
        "economie_mtn":     round(volume * 0.035 - frais_bc, 2),
        "economie_wu":      round(volume * 0.08  - frais_bc, 2),
        "repartition":      dict(sorted(repartition.items(), key=lambda x: -x[1])),
        "chaine_valide":    _est_chaine_valide(),
    })


@app.route("/api/chaine")
def api_chaine():
    blocs = BlockModel.query.order_by(BlockModel.index.asc()).all()
    return jsonify([b.to_dict() for b in blocs])

# ─── Transaction manuelle ──────────────────────────────────────────────────────

@app.route("/api/transaction", methods=["POST"])
def api_transaction():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"erreur": "JSON requis"}), 400
    try:
        montant = float(data.get("montant", 500))
        assert 1 <= montant <= 100_000
    except (ValueError, AssertionError):
        return jsonify({"erreur": "Montant invalide (1–100 000)"}), 400

    source      = data.get("source", "Paris")
    destination = data.get("destination", "Conakry")
    if source not in WALLETS_DIASPORA:
        source = "Paris"
    if destination not in WALLETS_GUINEE:
        destination = "Conakry"

    exp   = WALLETS_DIASPORA[source]
    dest  = WALLETS_GUINEE[destination]
    frais = round(montant * 0.001, 4)
    ts    = time.time()
    sig   = _signer(exp, dest, montant, ts)

    last = _get_last_block()
    tx_data = [{"expediteur": exp[:12] + "…", "destinataire": dest[:12] + "…",
                "montant": montant, "frais": frais, "ville_dest": destination,
                "source_ville": source, "horodatage": ts, "signature": sig}]

    h, nonce, bts, tm = _miner(last.index + 1, last.hash, tx_data)
    bloc = BlockModel(index=last.index + 1, hash=h, hash_precedent=last.hash,
                      nonce=nonce, horodatage=bts, temps_minage=tm)
    db.session.add(bloc)
    db.session.flush()
    tx = TransactionModel(block_id=bloc.id, expediteur=exp, destinataire=dest,
                          montant=montant, frais=frais, ville_dest=destination,
                          source_ville=source, signature=sig, horodatage=ts)
    db.session.add(tx)
    db.session.commit()
    return jsonify({"succes": True, "bloc": bloc.to_dict(), "transaction": tx.to_dict()})

# ─── Simulation ────────────────────────────────────────────────────────────────

@app.route("/api/simulation", methods=["POST"])
def api_simulation():
    data = request.get_json(silent=True) or {}
    try:
        n = int(data.get("nb_transactions", 10))
        assert 1 <= n <= 100
    except (ValueError, AssertionError):
        return jsonify({"erreur": "nb_transactions doit être entre 1 et 100"}), 400

    villes  = list(WALLETS_GUINEE.keys())
    sources = list(WALLETS_DIASPORA.keys())
    poids   = [45, 20, 18, 10, 7]
    txs     = []
    for _ in range(n):
        ville   = random.choices(villes, weights=poids, k=1)[0]
        source  = random.choice(sources)
        montant = round(random.uniform(300, 4000), 2)
        frais   = round(montant * 0.001, 4)
        ts      = time.time()
        exp     = WALLETS_DIASPORA[source]
        dest    = WALLETS_GUINEE[ville]
        sig     = _signer(exp, dest, montant, ts)
        txs.append({"expediteur": exp, "destinataire": dest, "montant": montant,
                     "frais": frais, "ville_dest": ville, "source_ville": source,
                     "horodatage": ts, "signature": sig})

    blocs_ajoutes = []
    for i in range(0, len(txs), 5):
        groupe = txs[i:i + 5]
        last   = _get_last_block()
        grp_hash = [{"expediteur": t["expediteur"][:12] + "…",
                     "destinataire": t["destinataire"][:12] + "…",
                     "montant": t["montant"], "frais": t["frais"],
                     "ville_dest": t["ville_dest"], "source_ville": t["source_ville"],
                     "horodatage": t["horodatage"], "signature": t["signature"]}
                    for t in groupe]
        h, nonce, bts, tm = _miner(last.index + 1, last.hash, grp_hash)
        bloc = BlockModel(index=last.index + 1, hash=h, hash_precedent=last.hash,
                          nonce=nonce, horodatage=bts, temps_minage=tm)
        db.session.add(bloc)
        db.session.flush()
        for t in groupe:
            db.session.add(TransactionModel(
                block_id=bloc.id, expediteur=t["expediteur"], destinataire=t["destinataire"],
                montant=t["montant"], frais=t["frais"], ville_dest=t["ville_dest"],
                source_ville=t["source_ville"], signature=t["signature"], horodatage=t["horodatage"]
            ))
        db.session.commit()
        blocs_ajoutes.append(bloc.to_dict())

    return jsonify({"succes": True, "blocs": blocs_ajoutes,
                    "stats": api_stats().get_json()})


@app.route("/api/reset", methods=["POST"])
def api_reset():
    TransactionModel.query.delete()
    BlockModel.query.delete()
    db.session.commit()
    _init_db()
    return jsonify({"succes": True})

# ─── MNBC ──────────────────────────────────────────────────────────────────────

@app.route("/api/mnbc/portefeuilles")
def api_portefeuilles():
    return jsonify({w.nif: w.to_dict() for w in MNBCWallet.query.all()})


@app.route("/api/mnbc/historique")
def api_historique():
    return jsonify([t.to_dict() for t in
                    MNBCTransfer.query.order_by(MNBCTransfer.horodatage.asc()).all()])


@app.route("/api/mnbc/aml")
def api_aml():
    return jsonify([e.to_dict() for e in
                    AMLEvent.query.order_by(AMLEvent.horodatage.desc()).all()])


@app.route("/api/mnbc/creer", methods=["POST"])
def api_creer_portefeuille():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"succes": False, "message": "JSON requis"}), 400
    nif   = str(data.get("nif", "")).strip()
    ville = str(data.get("ville", "")).strip()
    try:
        solde = float(data.get("solde", 0))
        assert solde >= 0
    except (ValueError, AssertionError):
        return jsonify({"succes": False, "message": "Solde invalide"}), 400
    if not (nif.isdigit() and len(nif) == 9):
        return jsonify({"succes": False, "message": "NIF invalide : 9 chiffres requis"})
    if MNBCWallet.query.get(nif):
        return jsonify({"succes": False, "message": f"NIF {nif} déjà enregistré"})
    db.session.add(MNBCWallet(nif=nif, solde=solde, ville=ville))
    db.session.commit()
    return jsonify({"succes": True, "message": f"Portefeuille créé — NIF {nif} ({ville}) : {solde} GNF-D"})


@app.route("/api/mnbc/transfert", methods=["POST"])
def api_transfert_mnbc():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"succes": False, "result": "JSON requis"}), 400
    nif_e = str(data.get("nif_e", "")).strip()
    nif_r = str(data.get("nif_r", "")).strip()
    motif = str(data.get("motif", ""))[:200]
    try:
        montant = float(data.get("montant", 0))
        assert montant > 0
    except (ValueError, AssertionError):
        return jsonify({"succes": False, "result": "Montant invalide"}), 400

    we = MNBCWallet.query.get(nif_e)
    wr = MNBCWallet.query.get(nif_r)
    if not we or not wr:
        return jsonify({"succes": False, "result": "Portefeuille introuvable"})

    we.reset_daily_if_needed()
    if we.depenses_jour + montant > PLAFOND_AML:
        db.session.add(AMLEvent(nif=nif_e, montant=montant, horodatage=time.time()))
        db.session.commit()
        return jsonify({"succes": False, "result": f"Plafond AML dépassé ({PLAFOND_AML} GNF-D/jour)"})
    if we.solde < montant:
        return jsonify({"succes": False, "result": "Solde insuffisant"})

    we.solde         -= montant
    we.depenses_jour += montant
    wr.solde         += montant
    tx_hash = hashlib.sha256(f"{nif_e}{nif_r}{montant}{time.time()}".encode()).hexdigest()[:16]
    transfer = MNBCTransfer(nif_e=nif_e, nif_r=nif_r, montant=montant, motif=motif,
                            tx_hash=tx_hash, horodatage=time.time(),
                            ville_e=we.ville, ville_r=wr.ville)
    db.session.add(transfer)
    db.session.commit()
    return jsonify({"succes": True, "result": transfer.to_dict()})


if __name__ == "__main__":
    with app.app_context():
        _init_db()
    app.run(debug=(os.getenv("FLASK_ENV") == "development"), port=5000)
