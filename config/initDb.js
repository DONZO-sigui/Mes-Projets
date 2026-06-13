const db = require('./db');

async function initializeDatabase() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS utilisateurs (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        mot_de_passe TEXT NOT NULL,
        role VARCHAR(30) DEFAULT 'Caissier',
        reset_token TEXT,
        reset_token_expiry TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Add columns if they do not exist (for existing tables)
      ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS reset_token TEXT;
      ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS reservoirs (
        id SERIAL PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        capacite NUMERIC(10,2) DEFAULT 0,
        niveau NUMERIC(10,2) DEFAULT 0,
        prix_vente NUMERIC(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS ventes (
        id SERIAL PRIMARY KEY,
        reservoir_id INTEGER REFERENCES reservoirs(id) ON DELETE CASCADE,
        quantite NUMERIC(10,2) NOT NULL,
        montant_total NUMERIC(10,2) NOT NULL,
        mode_paiement VARCHAR(30) DEFAULT 'Espèces',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS parametres (
        id SERIAL PRIMARY KEY,
        nom_entreprise VARCHAR(100) DEFAULT 'Station Manager Pro',
        adresse VARCHAR(255) DEFAULT '',
        telephone VARCHAR(50) DEFAULT '',
        email VARCHAR(100) DEFAULT '',
        devise VARCHAR(10) DEFAULT '€',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default settings if table is empty
    const paramCount = await db.query('SELECT COUNT(*) FROM parametres');
    if (parseInt(paramCount.rows[0].count) === 0) {
      await db.query(`
        INSERT INTO parametres (nom_entreprise, adresse, telephone, email, devise)
        VALUES ('Station Pro par Défaut', '123 Route Principale', '+00000000', 'contact@station.com', '€')
      `);
    }

    console.log('Base de données initialisée avec succès');
  } catch (error) {
    console.error('Erreur lors de l’initialisation de la base de données :', error.message);
    throw error;
  }
}

module.exports = initializeDatabase;
