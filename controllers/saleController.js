const db = require('../config/db');

// Enregistrer une nouvelle vente
const createSale = async (req, res) => {
  const { reservoir_id, montant_total, mode_paiement } = req.body;

  try {
    // 1. Démarrer une transaction SQL
    await db.query('BEGIN');

    // 2. Récupérer le prix du carburant pour calculer la quantité
    const tankResult = await db.query('SELECT prix_vente, niveau, nom FROM reservoirs WHERE id = $1 FOR UPDATE', [reservoir_id]);
    
    if (tankResult.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ message: 'Réservoir introuvable' });
    }

    const tank = tankResult.rows[0];
    const quantite_vendue = montant_total / tank.prix_vente;

    // Vérifier si le stock est suffisant
    if (tank.niveau < quantite_vendue) {
      await db.query('ROLLBACK');
      return res.status(400).json({ message: `Stock insuffisant dans le réservoir ${tank.nom}` });
    }

    // 3. Insérer la vente
    const saleResult = await db.query(
      'INSERT INTO ventes (reservoir_id, quantite, montant_total, mode_paiement) VALUES ($1, $2, $3, $4) RETURNING *',
      [reservoir_id, quantite_vendue, montant_total, mode_paiement]
    );

    // 4. Mettre à jour le niveau du réservoir
    await db.query(
      'UPDATE reservoirs SET niveau = niveau - $1 WHERE id = $2',
      [quantite_vendue, reservoir_id]
    );

    // 5. Valider la transaction
    await db.query('COMMIT');

    res.status(201).json({
      message: 'Vente enregistrée avec succès',
      sale: saleResult.rows[0],
      quantite_litres: quantite_vendue
    });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la vente' });
  }
};

// Récupérer les ventes récentes / stats (Pour le Dashboard)
const getStats = async (req, res) => {
  try {
    // Total des ventes d'aujourd'hui
    const todaySales = await db.query(`
      SELECT COALESCE(SUM(montant_total), 0) as ca_jour, COALESCE(SUM(quantite), 0) as litres_jour 
      FROM ventes 
      WHERE DATE(created_at) = CURRENT_DATE
    `);

    res.json({
      ca_jour: todaySales.rows[0].ca_jour,
      litres_jour: todaySales.rows[0].litres_jour
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération des statistiques' });
  }
};

// Récupérer l'historique complet des ventes (Pour l'Admin)
const getSalesHistory = async (req, res) => {
  try {
    const historyResult = await db.query(`
      SELECT v.id, v.quantite, v.montant_total, v.mode_paiement, v.created_at, r.nom as reservoir_nom 
      FROM ventes v
      JOIN reservoirs r ON v.reservoir_id = r.id
      ORDER BY v.created_at DESC
      LIMIT 100
    `);
    res.json(historyResult.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique' });
  }
};

module.exports = {
  createSale,
  getStats,
  getSalesHistory
};
