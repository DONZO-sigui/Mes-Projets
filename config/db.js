const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, '..', 'database', 'chatbot.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erreur ouverture base SQLite:', err.message);
        return;
    }
});

const initSQL = `
CREATE TABLE IF NOT EXISTS absences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT,
    date_absence TEXT,
    motif TEXT,
    justificatif TEXT
);

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT,
    password TEXT NOT NULL,
    role TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    sender TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

const seedUsers = [
    { username: 'directeur', email: 'directeur@demo.com', password: 'directeur123', role: 'directeur' },
    { username: 'etudiant', email: 'etudiant@demo.com', password: 'etudiant123', role: 'etudiant' }
];

const isHashedPassword = (value) => typeof value === 'string' && value.startsWith('$2');

const ensureAbsenceColumns = () => new Promise((resolve, reject) => {
    db.all('PRAGMA table_info(absences)', [], (err, columns) => {
        if (err) return reject(err);

        const existing = new Set((columns || []).map((column) => column.name));
        const statements = [];

        if (!existing.has('statut')) {
            statements.push("ALTER TABLE absences ADD COLUMN statut TEXT DEFAULT 'en_attente'");
        }
        if (!existing.has('declarant')) {
            statements.push('ALTER TABLE absences ADD COLUMN declarant TEXT');
        }
        if (!existing.has('matricule')) {
            statements.push('ALTER TABLE absences ADD COLUMN matricule TEXT');
        }
        if (!existing.has('niveau_etude')) {
            statements.push('ALTER TABLE absences ADD COLUMN niveau_etude TEXT');
        }
        if (!existing.has('valide_par')) {
            statements.push('ALTER TABLE absences ADD COLUMN valide_par TEXT');
        }
        if (!existing.has('date_validation')) {
            statements.push('ALTER TABLE absences ADD COLUMN date_validation TEXT');
        }
        if (!existing.has('filiere')) {
            statements.push('ALTER TABLE absences ADD COLUMN filiere TEXT');
        }

        if (!statements.length) return resolve();

        db.exec(statements.join('; '), (alterErr) => {
            if (alterErr) return reject(alterErr);
            resolve();
        });
    });
});

const ensureUserColumns = () => new Promise((resolve, reject) => {
    db.all('PRAGMA table_info(users)', [], (err, columns) => {
        if (err) return reject(err);

        const existing = new Set((columns || []).map((column) => column.name));
        const statements = [];

        if (!existing.has('email')) {
            statements.push("ALTER TABLE users ADD COLUMN email TEXT");
        }

        if (!statements.length) return resolve();

        db.exec(statements.join('; '), (alterErr) => {
            if (alterErr) return reject(alterErr);
            resolve();
        });
    });
});

db.serialize(() => {
    db.exec(initSQL, (err) => {
        if (err) {
            console.error('Erreur initialisation des tables SQLite:', err.message);
            return;
        }

        ensureAbsenceColumns().catch((migrationErr) => {
            console.error('Erreur migration colonnes absences:', migrationErr.message);
        });

        ensureUserColumns().catch((migrationErr) => {
            console.error('Erreur migration colonnes users:', migrationErr.message);
        });

        db.each('SELECT id, username, password, role FROM users', [], (err2, row) => {
            if (err2) return;

            if (!isHashedPassword(row.password) || row.password === 'plaintext') {
                const seed = seedUsers.find((item) => item.username === row.username);

                if (seed) {
                    const hashed = bcrypt.hashSync(seed.password, 10);
                    db.run(
                        'UPDATE users SET password = ?, role = ? WHERE id = ?',
                        [hashed, seed.role, row.id],
                        (updateErr) => {
                            if (updateErr) {
                                console.error('Erreur migration mot de passe:', updateErr.message);
                            }
                        }
                    );
                }
            }
        }, () => {
            const insertUser = (user) => new Promise((resolve, reject) => {
                const hashed = bcrypt.hashSync(user.password, 10);
                db.run('INSERT OR IGNORE INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                    [user.username, user.email, hashed, user.role],
                    (insertErr) => insertErr ? reject(insertErr) : resolve());
            });

            Promise.all(seedUsers.map(insertUser))
                .catch((seedErr) => console.error('Erreur insertion utilisateurs par défaut:', seedErr.message));
        });
    });
});

const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        const trimmed = sql.trim().toUpperCase();
        if (trimmed.startsWith('SELECT')) {
            db.all(sql, params, (err, rows) => {
                if (err) return reject(err);
                resolve({ rows });
            });
        } else if (trimmed.startsWith('INSERT')) {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                const lastID = this.lastID;
                db.get('SELECT * FROM absences WHERE id = ?', [lastID], (err2, row) => {
                    if (err2) return reject(err2);
                    resolve({ rows: row ? [row] : [] });
                });
            });
        } else {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ rows: [] });
            });
        }
    });
};

module.exports = {
    query,
    raw: db
};
