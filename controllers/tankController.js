const db = require('../config/db');

// Récupérer tous les réservoirs
const getAllTanks = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM reservoirs ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des réservoirs' });
  }
};

// Créer un nouveau réservoir (Admin)
const createTank = async (req, res) => {
  const { nom, capacite, niveau, prix_vente } = req.body;
  
  try {
    const result = await db.query(
      'INSERT INTO reservoirs (nom, capacite, niveau, prix_vente) VALUES ($1, $2, $3, $4) RETURNING *',
      [nom, capacite, niveau, prix_vente]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la création du réservoir' });
  }
};

// Mettre à jour un réservoir (Admin ou Livraison)
const updateTank = async (req, res) => {
  const { id } = req.params;
  const { nom, capacite, niveau, prix_vente } = req.body;

  try {
    const result = await db.query(
      'UPDATE reservoirs SET nom = $1, capacite = $2, niveau = $3, prix_vente = $4 WHERE id = $5 RETURNING *',
      [nom, capacite, niveau, prix_vente, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Réservoir non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour' });
  }
};

module.exports = {
  getAllTanks,
  createTank,
  updateTank
};
