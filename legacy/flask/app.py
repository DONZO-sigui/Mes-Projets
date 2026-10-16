"""
═══════════════════════════════════════════════════════════════
  GNF-Token Dashboard — Serveur Flask
  Étape 2 : Interface web pour la blockchain Guinée-Diaspora
═══════════════════════════════════════════════════════════════
"""

from flask import Flask, render_template, request, jsonify
import hashlib, time, json, random

app = Flask(__name__)

# ─────────────────────────────────────────────
#  BLOCKCHAIN (reprise de l'étape 1)
# ─────────────────────────────────────────────

class Transaction:
    def __init__(self, expediteur, destinataire, montant, ville_dest, source_ville):
        self.expediteur   = expediteur
        self.destinataire = destinataire
        self.montant      = round(float(montant), 2)
        self.frais        = round(float(montant) * 0.001, 4)
        self.horodatage   = time.time()
        self.ville_dest   = ville_dest
        self.source_ville = source_ville
        self.signature    = self._signer()

    def _signer(self):
        contenu = f"{self.expediteur}{self.destinataire}{self.montant}{self.horodatage}"
        return hashlib.sha256(contenu.encode()).hexdigest()[:16]

    def to_dict(self):
        return {
            "expediteur":   self.expediteur[:12] + "…",
            "destinataire": self.destinataire[:12] + "…",
            "montant":      self.montant,
            "frais":        self.frais,
            "ville_dest":   self.ville_dest,
            "source_ville": self.source_ville,
            "horodatage":   self.horodatage,
            "signature":    self.signature,
        }

class Bloc:
    DIFFICULTE = 3

    def __init__(self, index, transactions, hash_precedent="0"*64):
        self.index          = index
        self.transactions   = transactions
        self.hash_precedent = hash_precedent
        self.horodatage     = time.time()
        self.nonce          = 0
        self.hash           = self.miner()
        self.temps_minage   = 0

    def calculer_hash(self):
        contenu = json.dumps({
            "index":        self.index,
            "prev_hash":    self.hash_precedent,
            "timestamp":    self.horodatage,
            "transactions": [tx.to_dict() for tx in self.transactions],
            "nonce":        self.nonce,
        }, sort_keys=True)
        return hashlib.sha256(hashlib.sha256(contenu.encode()).hexdigest().encode()).hexdigest()

    def miner(self):
        debut = time.time()
        cible = "0" * self.DIFFICULTE
        while True:
            h = self.calculer_hash()
            if h.startswith(cible):
                self.temps_minage = round(time.time() - debut, 3)
                return h
            self.nonce += 1

    def to_dict(self):
        return {
            "index":          self.index,
            "nb_transactions":len(self.transactions),
            "hash":           self.hash,
            "hash_precedent": self.hash_precedent,
            "nonce":          self.nonce,
            "temps_minage":   self.temps_minage,
            "transactions":   [tx.to_dict() for tx in self.transactions],
        }

class Blockchain:
    def __init__(self):
        self.chaine = []
        genesis = Bloc(0, [], "0"*64)
        self.chaine.append(genesis)

    def ajouter_bloc(self, transactions):
        bloc = Bloc(len(self.chaine), transactions, self.chaine[-1].hash)
        self.chaine.append(bloc)
        return bloc

    def est_valide(self):
        for i in range(1, len(self.chaine)):
            if self.chaine[i].hash != self.chaine[i].calculer_hash():
                return False
            if self.chaine[i].hash_precedent != self.chaine[i-1].hash:
                return False
        return True

    def statistiques(self):
        toutes_tx = [tx for b in self.chaine[1:] for tx in b.transactions]
        if not toutes_tx:
            return {}
        volume       = sum(t.montant for t in toutes_tx)
        frais_bc     = sum(t.frais   for t in toutes_tx)
        repartition  = {}
        for tx in toutes_tx:
            repartition[tx.ville_dest] = repartition.get(tx.ville_dest, 0) + tx.montant
        return {
            "nb_blocs":        len(self.chaine) - 1,
            "nb_transactions": len(toutes_tx),
            "volume_total":    round(volume, 2),
            "frais_blockchain":round(frais_bc, 2),
            "frais_mtn":       round(volume * 0.035, 2),
            "frais_wu":        round(volume * 0.08, 2),
            "economie_mtn":    round(volume * 0.035 - frais_bc, 2),
            "economie_wu":     round(volume * 0.08  - frais_bc, 2),
            "repartition":     dict(sorted(repartition.items(), key=lambda x: -x[1])),
            "chaine_valide":   self.est_valide(),
        }

# ─────────────────────────────────────────────
#  MNBC Smart Contract
# ─────────────────────────────────────────────

class SmartContractMNBC:
    PLAFOND = 10_000

    def __init__(self):
        self.portefeuilles = {}
        self.historique    = []
        self.journal_aml   = []

    def valider_nif(self, nif):
        return str(nif).isdigit() and len(str(nif)) == 9

    def creer_portefeuille(self, nif, solde, ville):
        if not self.valider_nif(nif):
            return False, f"NIF invalide : {nif} (doit être 9 chiffres)"
        if str(nif) in self.portefeuilles:
            return False, f"NIF {nif} déjà enregistré"
        self.portefeuilles[str(nif)] = {"solde": float(solde), "depenses_jour": 0.0, "ville": ville}
        return True, f"Portefeuille créé — NIF {nif} ({ville}) : {solde} GNF-D"

    def transfert(self, nif_e, nif_r, montant, motif=""):
        nif_e, nif_r = str(nif_e), str(nif_r)
        montant = float(montant)
        if nif_e not in self.portefeuilles or nif_r not in self.portefeuilles:
            return False, "Portefeuille introuvable"
        if self.portefeuilles[nif_e]["depenses_jour"] + montant > self.PLAFOND:
            self.journal_aml.append({"nif": nif_e, "montant": montant, "ts": time.time()})
            return False, f"Plafond AML dépassé ({self.PLAFOND} GNF-D/jour)"
        if self.portefeuilles[nif_e]["solde"] < montant:
            return False, "Solde insuffisant"
        self.portefeuilles[nif_e]["solde"]         -= montant
        self.portefeuilles[nif_e]["depenses_jour"] += montant
        self.portefeuilles[nif_r]["solde"]         += montant
        tx_hash = hashlib.sha256(f"{nif_e}{nif_r}{montant}{time.time()}".encode()).hexdigest()[:16]
        rec = {"de": nif_e, "vers": nif_r, "montant": montant, "motif": motif,
               "hash": tx_hash, "ts": time.time(),
               "ville_e": self.portefeuilles[nif_e]["ville"],
               "ville_r": self.portefeuilles[nif_r]["ville"]}
        self.historique.append(rec)
        return True, rec

# ─────────────────────────────────────────────
#  ÉTAT GLOBAL DE L'APPLICATION
# ─────────────────────────────────────────────

bc   = Blockchain()
mnbc = SmartContractMNBC()

WALLETS_DIASPORA = {v: hashlib.sha256(f"{v}{42}".encode()).hexdigest()
                    for v in ["Paris","New York","Dubai","Lyon","Londres"]}
WALLETS_GUINEE   = {v: hashlib.sha256(f"{v}{42}".encode()).hexdigest()
                    for v in ["Conakry","Kindia","Kankan","Labé","N'Zérékoré"]}

# Pré-charger quelques portefeuilles MNBC
for nif, solde, ville in [
    ("100234567", 15000, "Conakry"),
    ("200345678",  5500, "Kindia"),
    ("300456789", 12000, "Kankan"),
    ("400567890",  3000, "Labé"),
    ("500678901",  7200, "N'Zérékoré"),
]:
    mnbc.creer_portefeuille(nif, solde, ville)

# ─────────────────────────────────────────────
#  ROUTES FLASK
# ─────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/stats")
def api_stats():
    return jsonify(bc.statistiques())

@app.route("/api/chaine")
def api_chaine():
    return jsonify([b.to_dict() for b in bc.chaine])

@app.route("/api/transaction", methods=["POST"])
def api_transaction():
    data        = request.json
    source      = data.get("source", "Paris")
    destination = data.get("destination", "Conakry")
    montant     = float(data.get("montant", 500))

    tx = Transaction(
        WALLETS_DIASPORA.get(source, WALLETS_DIASPORA["Paris"]),
        WALLETS_GUINEE.get(destination, WALLETS_GUINEE["Conakry"]),
        montant, destination, source
    )
    bloc = bc.ajouter_bloc([tx])
    return jsonify({"succes": True, "bloc": bloc.to_dict(), "transaction": tx.to_dict()})

@app.route("/api/simulation", methods=["POST"])
def api_simulation():
    """Lance une simulation de N transactions aléatoires."""
    n = int(request.json.get("nb_transactions", 10))
    villes  = list(WALLETS_GUINEE.keys())
    sources = list(WALLETS_DIASPORA.keys())
    poids   = [45, 20, 18, 10, 7]
    txs = []
    for _ in range(n):
        ville  = random.choices(villes, weights=poids, k=1)[0]
        source = random.choice(sources)
        tx = Transaction(
            WALLETS_DIASPORA[source], WALLETS_GUINEE[ville],
            round(random.uniform(300, 4000), 2), ville, source
        )
        txs.append(tx)
    # Grouper par blocs de 5
    blocs_ajoutes = []
    for i in range(0, len(txs), 5):
        groupe = txs[i:i+5]
        bloc = bc.ajouter_bloc(groupe)
        blocs_ajoutes.append(bloc.to_dict())
    return jsonify({"succes": True, "blocs": blocs_ajoutes, "stats": bc.statistiques()})

@app.route("/api/reset", methods=["POST"])
def api_reset():
    global bc
    bc = Blockchain()
    return jsonify({"succes": True})

# ── MNBC routes ──

@app.route("/api/mnbc/portefeuilles")
def api_portefeuilles():
    return jsonify(mnbc.portefeuilles)

@app.route("/api/mnbc/historique")
def api_historique():
    return jsonify(mnbc.historique)

@app.route("/api/mnbc/aml")
def api_aml():
    return jsonify(mnbc.journal_aml)

@app.route("/api/mnbc/creer", methods=["POST"])
def api_creer_portefeuille():
    data = request.json
    ok, msg = mnbc.creer_portefeuille(data["nif"], data["solde"], data["ville"])
    return jsonify({"succes": ok, "message": msg})

@app.route("/api/mnbc/transfert", methods=["POST"])
def api_transfert_mnbc():
    data = request.json
    ok, result = mnbc.transfert(data["nif_e"], data["nif_r"], data["montant"], data.get("motif",""))
    return jsonify({"succes": ok, "result": result})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
