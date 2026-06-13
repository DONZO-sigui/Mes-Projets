const db = require('../config/db');
const bcrypt = require('bcrypt');

// Récupérer tous les utilisateurs (sans mot de passe)
const getUsers = async (req, res) => {
  try {
    const result = await db.query('SELECT id, nom, email, role FROM utilisateurs ORDER BY id ASC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs' });
  }
};

// Ajouter un utilisateur (Admin seulement)
const createUser = async (req, res) => {
  const { nom, email, password, role } = req.body;

  try {
    const userExists = await db.query('SELECT * FROM utilisateurs WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await db.query(
      'INSERT INTO utilisateurs (nom, email, mot_de_passe, role) VALUES ($1, $2, $3, $4) RETURNING id, nom, email, role',
      [nom, email, hashedPassword, role || 'Caissier']
    );

    res.status(201).json({ message: 'Utilisateur créé', user: newUser.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// Supprimer un utilisateur
const deleteUser = async (req, res) => {
  const { id } = req.params;

  // Empêcher l'admin de se supprimer lui-même
  if (parseInt(id) === req.user.id) {
    return res.status(403).json({ message: 'Action impossible : vous ne pouvez pas supprimer votre propre compte.' });
  }

  try {
    const result = await db.query('DELETE FROM utilisateurs WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
};

module.exports = {
  getUsers,
  createUser,
  deleteUser
};
