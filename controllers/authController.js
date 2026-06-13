const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await db.query('SELECT * FROM utilisateurs WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const user = result.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.mot_de_passe);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const register = async (req, res) => {
  const { nom, email, password, role } = req.body;

  try {
    // Check if user exists
    const userExists = await db.query('SELECT * FROM utilisateurs WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const newUser = await db.query(
      'INSERT INTO utilisateurs (nom, email, mot_de_passe, role) VALUES ($1, $2, $3, $4) RETURNING id, nom, email, role',
      [nom, email, hashedPassword, role || 'Caissier']
    );

    res.status(201).json({
      message: 'Utilisateur créé avec succès',
      user: newUser.rows[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  
  try {
    const result = await db.query('SELECT * FROM utilisateurs WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Aucun utilisateur trouvé avec cet e-mail" });
    }
    
    // Create token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
    
    // Save to DB
    await db.query(
      'UPDATE utilisateurs SET reset_token = $1, reset_token_expiry = $2 WHERE email = $3',
      [resetToken, resetTokenExpiry, email]
    );
    
    // Simulate email send
    console.log(`[SIMULATED EMAIL] Send to: ${email}`);
    console.log(`[SIMULATED EMAIL] Reset Link: http://localhost:5173/reset-password?token=${resetToken}`);
    
    res.json({ 
      message: 'Un lien de réinitialisation a été généré. Veuillez consulter la console ou le lien ci-dessous.',
      token: resetToken 
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la demande de réinitialisation' });
  }
};

const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;
  
  try {
    const result = await db.query(
      'SELECT * FROM utilisateurs WHERE reset_token = $1 AND reset_token_expiry > NOW()',
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Jeton invalide ou expiré' });
    }
    
    const user = result.rows[0];
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password and clear token
    await db.query(
      'UPDATE utilisateurs SET mot_de_passe = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
      [hashedPassword, user.id]
    );
    
    res.json({ message: 'Mot de passe réinitialisé avec succès' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la réinitialisation' });
  }
};

module.exports = {
  login,
  register,
  forgotPassword,
  resetPassword
};
