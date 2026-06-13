const db = require('../config/db');

const getSettings = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM parametres ORDER BY id ASC LIMIT 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Aucun paramètre trouvé' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const updateSettings = async (req, res) => {
  const { nom_entreprise, adresse, telephone, email, devise } = req.body;
  try {
    // Assuming ID = 1 for the main settings row
    const result = await db.query(
      `UPDATE parametres 
       SET nom_entreprise = $1, adresse = $2, telephone = $3, email = $4, devise = $5 
       WHERE id = (SELECT MIN(id) FROM parametres) 
       RETURNING *`,
      [nom_entreprise, adresse, telephone, email, devise]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Aucun paramètre trouvé à mettre à jour' });
    }

    res.json({
      message: 'Paramètres mis à jour avec succès',
      settings: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = {
  getSettings,
  updateSettings
};
