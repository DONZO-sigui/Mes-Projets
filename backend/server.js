/**
 * OrientGuinée — Backend API (Express + SQLite)
 * Port : 5000
 */

require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');
const Database = require('better-sqlite3');
const path     = require('path');
const https    = require('https');

// ─────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────
const PORT       = process.env.PORT       || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'orient_guinee_secret_dev';

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────
// DATABASE
// ─────────────────────────────────────────────────
const db = new Database(path.join(__dirname, 'database.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    UNIQUE NOT NULL,
    password_hash TEXT    NOT NULL,
    created_at    TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS universities (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    acronym       TEXT,
    status        TEXT DEFAULT 'publique',
    city          TEXT,
    founded_year  INTEGER,
    website       TEXT,
    description   TEXT,
    logo_url      TEXT,
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS faculties (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    description   TEXT,
    university_id INTEGER REFERENCES universities(id) ON DELETE CASCADE,
    created_at    TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS programs (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT NOT NULL,
    level          TEXT DEFAULT 'Licence',
    duration_years INTEGER DEFAULT 3,
    description    TEXT,
    specialties    TEXT,
    admission_info TEXT,
    faculty_id     INTEGER REFERENCES faculties(id) ON DELETE CASCADE,
    created_at     TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT,
    skills      TEXT,
    salary_range TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS program_jobs (
    program_id INTEGER REFERENCES programs(id) ON DELETE CASCADE,
    job_id     INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    PRIMARY KEY (program_id, job_id)
  );
`);

// ── Migrations (ajout de colonnes manquantes sans détruire les données) ──
{
  const jobCols = db.prepare('PRAGMA table_info(jobs)').all().map(c => c.name);
  if (!jobCols.includes('sector'))          db.exec('ALTER TABLE jobs ADD COLUMN sector TEXT');
  if (!jobCols.includes('interest_tags'))   db.exec('ALTER TABLE jobs ADD COLUMN interest_tags TEXT');
  if (!jobCols.includes('required_skills')) db.exec('ALTER TABLE jobs ADD COLUMN required_skills TEXT');

  const prgCols = db.prepare('PRAGMA table_info(programs)').all().map(c => c.name);
  if (!prgCols.includes('admission_conditions')) db.exec('ALTER TABLE programs ADD COLUMN admission_conditions TEXT');
}

// ── Seed data (runs only if tables are empty) ────
function seed() {
  const adminCount = db.prepare('SELECT COUNT(*) as n FROM admins').get().n;
  if (adminCount > 0) return;

  console.log('⏳ Initialisation des données de démo...');

  // Admin
  const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin2025!', 10);
  db.prepare(`INSERT INTO admins (email, password_hash) VALUES (?, ?)`)
    .run(process.env.ADMIN_EMAIL || 'admin@orientguinee.gn', hash);

  // ── Universities ─────────────────────────────
  const insertUni = db.prepare(`
    INSERT INTO universities (name, acronym, status, city, founded_year, website, description)
    VALUES (@name, @acronym, @status, @city, @founded_year, @website, @description)
  `);

  const unis = [
    {
      name: 'Université Gamal Abdel Nasser de Conakry', acronym: 'UGANC',
      status: 'publique', city: 'Conakry', founded_year: 1962,
      website: 'https://uganc.edu.gn',
      description: "La plus grande université publique de Guinée, formant des milliers d'étudiants chaque année dans toutes les disciplines.",
    },
    {
      name: 'Université Kofi Annan de Guinée', acronym: 'UKAG',
      status: 'privee', city: 'Conakry', founded_year: 1998,
      website: 'https://ukag.edu.gn',
      description: "Université privée d'excellence axée sur les technologies de l'information, la gestion et le droit.",
    },
    {
      name: 'Université Julius Nyerere de Kankan', acronym: 'UJNK',
      status: 'publique', city: 'Kankan', founded_year: 1963,
      website: null,
      description: "Établissement public historique de la Haute-Guinée, spécialisé dans les lettres, les sciences humaines et l'agriculture.",
    },
    {
      name: 'Institut Supérieur des Sciences de la Santé', acronym: 'ISSS',
      status: 'privee', city: 'Conakry', founded_year: 2005,
      website: null,
      description: "Institut spécialisé dans la formation des professions médicales et paramédicales.",
    },
    {
      name: "Université de Labé", acronym: 'UL',
      status: 'publique', city: 'Labé', founded_year: 2000,
      website: null,
      description: "Université publique du Fouta Djalon, proposant des formations en lettres, droit et sciences.",
    },
    {
      name: "Institut Polytechnique de Conakry", acronym: 'IPC',
      status: 'privee', city: 'Conakry', founded_year: 2010,
      website: null,
      description: "École d'ingénieurs privée formant aux métiers du numérique, des réseaux et du génie civil.",
    },
  ];

  const uniIds = {};
  for (const u of unis) {
    const res = insertUni.run(u);
    uniIds[u.acronym] = res.lastInsertRowid;
  }

  // ── Jobs ─────────────────────────────────────
  const insertJob = db.prepare(`
    INSERT INTO jobs (name, description, skills, salary_range)
    VALUES (@name, @description, @skills, @salary_range)
  `);

  const jobData = [
    { name: 'Ingénieur Logiciel',       description: "Conception et développement de logiciels, d'applications web et mobiles pour des entreprises ou en freelance.", skills: 'Programmation, Algorithmique, Travail en équipe', salary_range: '2 000 000 – 5 000 000 GNF/mois' },
    { name: 'Médecin Généraliste',      description: 'Diagnostic et traitement des maladies courantes, orientation vers les spécialistes, suivi des patients.',       skills: 'Sciences médicales, Empathie, Rigueur',        salary_range: '3 000 000 – 8 000 000 GNF/mois' },
    { name: 'Avocat',                   description: 'Conseil juridique, représentation des clients devant les tribunaux, rédaction de contrats.',                    skills: 'Droit, Argumentation, Rédaction',               salary_range: '2 500 000 – 7 000 000 GNF/mois' },
    { name: 'Comptable / Auditeur',     description: 'Gestion de la comptabilité des entreprises, établissement des bilans financiers, audit et conseil fiscal.',    skills: 'Comptabilité, Excel, Rigueur',                  salary_range: '1 500 000 – 4 000 000 GNF/mois' },
    { name: 'Journaliste',              description: 'Collecte et diffusion de l\'information, enquêtes de terrain, rédaction d\'articles pour la presse écrite ou audiovisuelle.', skills: 'Écriture, Curiosité, Communication',  salary_range: '1 000 000 – 3 000 000 GNF/mois' },
    { name: 'Économiste',              description: 'Analyse des marchés, élaboration de politiques économiques, conseil auprès des entreprises et institutions.', skills: 'Analyse, Statistiques, Économie',                salary_range: '2 000 000 – 5 000 000 GNF/mois' },
    { name: 'Pharmacien',               description: 'Délivrance des médicaments, conseil aux patients, gestion d\'une officine ou travail en industrie pharmaceutique.', skills: 'Chimie, Pharmacologie, Rigueur',          salary_range: '2 500 000 – 6 000 000 GNF/mois' },
    { name: 'Enseignant / Professeur',  description: 'Transmission du savoir aux élèves ou étudiants dans un établissement scolaire ou universitaire.',              skills: 'Pédagogie, Communication, Patience',            salary_range: '1 000 000 – 2 500 000 GNF/mois' },
    { name: 'Architecte',              description: 'Conception et suivi de la construction de bâtiments, élaboration des plans architecturaux.',                   skills: 'Dessin technique, Créativité, Gestion de projet', salary_range: '2 000 000 – 6 000 000 GNF/mois' },
    { name: 'Infirmier / Infirmière',   description: 'Soins aux patients, administration des médicaments, suivi post-opératoire sous supervision médicale.',         skills: 'Soins, Empathie, Résistance au stress',         salary_range: '1 200 000 – 3 000 000 GNF/mois' },
  ];

  const jobIds = {};
  for (const j of jobData) {
    const res = insertJob.run(j);
    jobIds[j.name] = res.lastInsertRowid;
  }

  // ── Faculties & Programs ─────────────────────
  const insertFac = db.prepare(`INSERT INTO faculties (name, description, university_id) VALUES (?, ?, ?)`);
  const insertPrg = db.prepare(`
    INSERT INTO programs (name, level, duration_years, description, faculty_id)
    VALUES (@name, @level, @duration_years, @description, @faculty_id)
  `);
  const insertPJ  = db.prepare(`INSERT OR IGNORE INTO program_jobs VALUES (?, ?)`);

  function addFaculty(name, desc, uniAcro) {
    return insertFac.run(name, desc, uniIds[uniAcro]).lastInsertRowid;
  }
  function addProgram(name, level, years, desc, facId) {
    return insertPrg.run({ name, level, duration_years: years, description: desc, faculty_id: facId }).lastInsertRowid;
  }
  function linkJob(progId, jobName) {
    if (jobIds[jobName]) insertPJ.run(progId, jobIds[jobName]);
  }

  // UGANC
  const facSciUganc = addFaculty('Faculté des Sciences et Techniques', 'Formation en mathématiques, physique et informatique.', 'UGANC');
  const pMath  = addProgram('Mathématiques', 'Licence', 3, 'Algèbre, Analyse, Probabilités et Statistiques.', facSciUganc);
  linkJob(pMath, 'Enseignant / Professeur'); linkJob(pMath, 'Économiste');
  const pInfo  = addProgram('Informatique', 'Licence', 3, 'Programmation, Systèmes, Réseaux et Intelligence Artificielle.', facSciUganc);
  linkJob(pInfo, 'Ingénieur Logiciel');

  const facMed = addFaculty('Faculté de Médecine et des Sciences de la Santé', 'Formation médicale et pharmaceutique.', 'UGANC');
  const pMedG  = addProgram('Médecine Générale', 'Doctorat', 7, 'Anatomie, Physiologie, Pathologie, Stages hospitaliers.', facMed);
  linkJob(pMedG, 'Médecin Généraliste'); linkJob(pMedG, 'Infirmier / Infirmière');
  const pPharm = addProgram('Pharmacie', 'Doctorat', 5, 'Chimie pharmaceutique, Pharmacologie, Toxicologie.', facMed);
  linkJob(pPharm, 'Pharmacien');

  const facDroit = addFaculty('Faculté de Droit et Sciences Politiques', 'Formation juridique et politique.', 'UGANC');
  const pDroit  = addProgram('Droit Privé', 'Licence', 3, 'Droit civil, Commercial, Droit des affaires.', facDroit);
  linkJob(pDroit, 'Avocat');
  const pEco   = addProgram('Sciences Économiques', 'Licence', 3, 'Macroéconomie, Microéconomie, Économétrie.', facDroit);
  linkJob(pEco, 'Économiste'); linkJob(pEco, 'Comptable / Auditeur');

  const facLettres = addFaculty('Faculté des Lettres et Sciences Humaines', 'Littérature, Philosophie, Journalisme.', 'UGANC');
  const pLettres = addProgram('Lettres Modernes', 'Licence', 3, 'Littérature française et africaine, Linguistique, Philosophie.', facLettres);
  linkJob(pLettres, 'Journaliste'); linkJob(pLettres, 'Enseignant / Professeur');

  // UKAG
  const facInfoUkag = addFaculty("Faculté d'Informatique et Technologies", 'Génie logiciel, réseaux, cybersécurité.', 'UKAG');
  const pGL    = addProgram('Génie Logiciel', 'Licence', 3, 'Développement web/mobile, Architecture logicielle.', facInfoUkag);
  linkJob(pGL, 'Ingénieur Logiciel');
  const pNet   = addProgram('Réseaux et Télécommunications', 'Licence', 3, 'Administration réseau, Cloud, Cybersécurité.', facInfoUkag);
  linkJob(pNet, 'Ingénieur Logiciel');

  const facGest = addFaculty('Faculté de Gestion et Commerce', 'Finance, marketing, management.', 'UKAG');
  const pFin   = addProgram('Finance et Comptabilité', 'Licence', 3, 'Comptabilité générale, Fiscalité, Contrôle de gestion.', facGest);
  linkJob(pFin, 'Comptable / Auditeur'); linkJob(pFin, 'Économiste');

  // IPC
  const facArchi = addFaculty('Département Génie Civil et Architecture', 'Architecture, BTP, urbanisme.', 'IPC');
  const pArchi = addProgram('Architecture et Urbanisme', 'Licence', 5, 'Dessin architectural, Matériaux, Urbanisme.', facArchi);
  linkJob(pArchi, 'Architecte');

  // ISSS
  const facParamed = addFaculty('Département des Sciences Infirmières', 'Formation paramédicale complète.', 'ISSS');
  const pInfirmier = addProgram('Sciences Infirmières', 'Licence', 3, 'Soins infirmiers, Urgences médicales, Nutrition.', facParamed);
  linkJob(pInfirmier, 'Infirmier / Infirmière');

  console.log('✅ Données de démo insérées avec succès.');
}

seed();

// ─────────────────────────────────────────────────
// MIDDLEWARE — vérification JWT admin
// ─────────────────────────────────────────────────
function authAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Non autorisé' });
  try {
    req.admin = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

// ─────────────────────────────────────────────────
// ROUTES — AUTH
// ─────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash))
    return res.status(401).json({ error: 'Identifiants incorrects' });

  const token = jwt.sign({ id: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, admin: { id: admin.id, email: admin.email } });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis' });
  // En production : envoyer un email. Ici on simule.
  res.json({ message: `Si un compte existe pour ${email}, un email de récupération a été envoyé.` });
});

// ─────────────────────────────────────────────────
// ROUTES — UNIVERSITÉS (public)
// ─────────────────────────────────────────────────
app.get('/api/universities', (req, res) => {
  const { page = 1, limit = 10, search, status, city } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let where = 'WHERE 1=1';
  const params = [];
  if (search) { where += ' AND (name LIKE ? OR acronym LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (status) { where += ' AND status = ?'; params.push(status); }
  if (city)   { where += ' AND city LIKE ?'; params.push(`%${city}%`); }

  const total = db.prepare(`SELECT COUNT(*) as n FROM universities ${where}`).get(...params).n;
  const items = db.prepare(`SELECT * FROM universities ${where} ORDER BY name LIMIT ? OFFSET ?`)
    .all(...params, Number(limit), offset);

  res.json({ total, page: Number(page), items });
});

app.get('/api/universities/:id', (req, res) => {
  const uni = db.prepare('SELECT * FROM universities WHERE id = ?').get(req.params.id);
  if (!uni) return res.status(404).json({ error: 'Université introuvable' });

  const faculties = db.prepare('SELECT * FROM faculties WHERE university_id = ?').all(uni.id);
  for (const fac of faculties) {
    const programs = db.prepare('SELECT * FROM programs WHERE faculty_id = ?').all(fac.id);
    for (const prog of programs) {
      prog.jobs = db.prepare(`
        SELECT j.* FROM jobs j
        JOIN program_jobs pj ON pj.job_id = j.id
        WHERE pj.program_id = ?
      `).all(prog.id);
    }
    fac.programs = programs;
  }
  uni.faculties = faculties;
  res.json(uni);
});

// ─────────────────────────────────────────────────
// ROUTES — FACULTÉS (public)
// ─────────────────────────────────────────────────
app.get('/api/faculties/:id', (req, res) => {
  const fac = db.prepare('SELECT * FROM faculties WHERE id = ?').get(req.params.id);
  if (!fac) return res.status(404).json({ error: 'Faculté introuvable' });
  fac.programs = db.prepare('SELECT * FROM programs WHERE faculty_id = ?').all(fac.id);
  res.json(fac);
});

// ─────────────────────────────────────────────────
// ROUTES — FILIÈRES (public)
// ─────────────────────────────────────────────────
app.get('/api/programs/:id', (req, res) => {
  const prog = db.prepare('SELECT * FROM programs WHERE id = ?').get(req.params.id);
  if (!prog) return res.status(404).json({ error: 'Filière introuvable' });
  prog.jobs = db.prepare(`
    SELECT j.* FROM jobs j JOIN program_jobs pj ON pj.job_id = j.id WHERE pj.program_id = ?
  `).all(prog.id);
  prog.faculty = db.prepare(`
    SELECT f.*, u.name as university_name, u.id as university_id
    FROM faculties f JOIN universities u ON u.id = f.university_id
    WHERE f.id = ?
  `).get(prog.faculty_id);
  res.json(prog);
});

// ─────────────────────────────────────────────────
// ROUTES — MÉTIERS (public)
// ─────────────────────────────────────────────────
app.get('/api/jobs', (req, res) => {
  res.json(db.prepare('SELECT * FROM jobs ORDER BY name').all());
});

app.get('/api/jobs/:id', (req, res) => {
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Métier introuvable' });
  job.programs = db.prepare(`
    SELECT p.*, f.name as faculty_name, u.name as university_name
    FROM programs p
    JOIN program_jobs pj ON pj.program_id = p.id
    JOIN faculties f ON f.id = p.faculty_id
    JOIN universities u ON u.id = f.university_id
    WHERE pj.job_id = ?
  `).all(job.id);
  res.json(job);
});

// ─────────────────────────────────────────────────
// ROUTE — TEST D'ORIENTATION
// ─────────────────────────────────────────────────
app.post('/api/quiz/submit', (req, res) => {
  const answers = req.body; // { 1: 'maths', 2: 'labo', 3: 'logique' }

  // Mapping réponses → tags
  const profileMap = {
    maths:      ['ingenierie', 'sciences', 'mathematiques'],
    bio:        ['sante', 'sciences', 'biologie'],
    lettres:    ['communication', 'droit', 'enseignement'],
    eco:        ['gestion', 'finance', 'economie'],
    bureau:     ['informatique', 'gestion', 'finance'],
    terrain:    ['sante', 'ingenierie', 'architecture'],
    labo:       ['sante', 'sciences', 'biologie'],
    public:     ['communication', 'sante', 'enseignement'],
    logique:    ['informatique', 'ingenierie', 'mathematiques'],
    creativite: ['architecture', 'communication', 'design'],
    empathie:   ['sante', 'enseignement', 'communication'],
    leadership: ['gestion', 'droit', 'finance'],
  };

  // Score par job
  const jobKeywords = {
    'Ingénieur Logiciel':      ['informatique', 'ingenierie', 'mathematiques', 'bureau'],
    'Médecin Généraliste':     ['sante', 'biologie', 'labo', 'empathie'],
    'Avocat':                  ['droit', 'communication', 'leadership'],
    'Comptable / Auditeur':    ['gestion', 'finance', 'bureau', 'logique'],
    'Journaliste':             ['communication', 'creativite', 'public'],
    'Économiste':             ['economie', 'mathematiques', 'gestion', 'logique'],
    'Pharmacien':              ['sante', 'biologie', 'labo', 'sciences'],
    'Enseignant / Professeur': ['enseignement', 'communication', 'empathie'],
    'Architecte':              ['architecture', 'creativite', 'ingenierie'],
    'Infirmier / Infirmière':  ['sante', 'empathie', 'public', 'terrain'],
  };

  // Collect tags from answers
  const tags = new Set();
  for (const ans of Object.values(answers)) {
    (profileMap[ans] || []).forEach((t) => tags.add(t));
    tags.add(ans);
  }

  // Score jobs
  const scores = {};
  for (const [jobName, keywords] of Object.entries(jobKeywords)) {
    scores[jobName] = keywords.filter((k) => tags.has(k)).length;
  }

  const topJobNames = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([name]) => name);

  const recommended_jobs = topJobNames.length
    ? db.prepare(`SELECT * FROM jobs WHERE name IN (${topJobNames.map(() => '?').join(',')})`)
        .all(...topJobNames)
    : db.prepare('SELECT * FROM jobs ORDER BY RANDOM() LIMIT 3').all();

  // Recommend programs linked to those jobs
  const jobIdsForPrograms = recommended_jobs.map((j) => j.id);
  let recommended_programs = [];
  if (jobIdsForPrograms.length) {
    recommended_programs = db.prepare(`
      SELECT DISTINCT p.* FROM programs p
      JOIN program_jobs pj ON pj.program_id = p.id
      WHERE pj.job_id IN (${jobIdsForPrograms.map(() => '?').join(',')})
      LIMIT 4
    `).all(...jobIdsForPrograms);
  }

  // Recommend universities that have those programs
  const facIds = recommended_programs.map((p) => p.faculty_id);
  let recommended_universities = [];
  if (facIds.length) {
    recommended_universities = db.prepare(`
      SELECT DISTINCT u.* FROM universities u
      JOIN faculties f ON f.university_id = u.id
      WHERE f.id IN (${facIds.map(() => '?').join(',')})
      LIMIT 3
    `).all(...facIds);
  }

  res.json({ recommended_jobs, recommended_programs, recommended_universities });
});

// ─────────────────────────────────────────────────
// ROUTE — CHATBOT IA (Google Gemini)
// ─────────────────────────────────────────────────
const GEMINI_SYSTEM_PROMPT = `Tu es le Conseiller d'Orientation IA d'OrientGuinée, une plateforme officielle d'orientation scolaire pour les nouveaux bacheliers guinéens, sous la tutelle du Ministère de l'Enseignement Supérieur, de la Recherche Scientifique et de l'Innovation de Guinée (MESRSI).

Contexte de la plateforme :
- Universités référencées : UGANC (Université Gamal Abdel Nasser de Conakry, publique), UKAG (Université Kofi Annan de Guinée, privée, Conakry), UJNK (Université Julius Nyerere de Kankan, publique), ISSS (Institut Supérieur des Sciences de la Santé, Conakry), Université de Labé (publique), IPC (Institut Polytechnique de Conakry, privée).
- Filières disponibles : Informatique/Génie Logiciel (3 ans Licence), Médecine Générale (7 ans jusqu'au Doctorat), Droit (3 ans), Gestion/Finance (3 ans), Architecture (5 ans), Sciences de l'Éducation (3 ans).
- Métiers référencés : Ingénieur Logiciel, Médecin Généraliste, Avocat, Comptable, Architecte, Administrateur Réseau, Économiste, Journaliste.
- La plateforme propose un test d'orientation gratuit de 5 minutes avec recommandations personnalisées.

Directives :
- Réponds TOUJOURS en français, avec bienveillance, chaleur et encouragement.
- Tu peux répondre à n'importe quelle question (culture générale, sciences, actualité, etc.) — tu es un assistant complet.
- Quand c'est pertinent, guide l'utilisateur vers les ressources de la plateforme (universités, filières, test d'orientation).
- Sois concis mais complet. Utilise des listes à puces pour structurer si nécessaire.
- Ne commence jamais ta réponse par "En tant qu'IA" ou similaire. Parle naturellement.`;

function callGemini(message, history) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'VOTRE_CLE_ICI') {
      return reject(new Error('Clé API Gemini non configurée'));
    }

    const contents = [
      ...(history || []),
      { role: 'user', parts: [{ text: message }] },
    ];

    const payload = JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: GEMINI_SYSTEM_PROMPT }] },
      generationConfig: { temperature: 0.75, maxOutputTokens: 1024 },
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (geminiRes) => {
      let raw = '';
      geminiRes.on('data', (chunk) => { raw += chunk; });
      geminiRes.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) resolve(text.trim());
          else reject(new Error(`Gemini: ${JSON.stringify(parsed.error || parsed)}`));
        } catch (e) { reject(e); }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

app.post('/api/chat', async (req, res) => {
  const { message = '', history = [] } = req.body;

  try {
    const reply = await callGemini(message, history);
    res.json({ reply });
  } catch (err) {
    console.error('Gemini error:', err.message);
    res.json({
      reply: "⚠️ Le service IA est momentanément indisponible. Vérifiez que la clé GEMINI_API_KEY est bien renseignée dans le fichier backend/.env, puis redémarrez le serveur.",
    });
  }
});

// ─────────────────────────────────────────────────
// ROUTES — ADMIN CRUD (protégées)
// ─────────────────────────────────────────────────
const ALLOWED_ENTITIES = ['universities', 'faculties', 'programs', 'jobs', 'admins'];

app.get('/api/admin/:entity', authAdmin, (req, res) => {
  const { entity } = req.params;
  if (!ALLOWED_ENTITIES.includes(entity)) return res.status(400).json({ error: 'Entité invalide' });
  const rows = db.prepare(`SELECT * FROM ${entity} ORDER BY id DESC`).all();
  res.json({ items: rows, total: rows.length });
});

app.get('/api/admin/:entity/:id', authAdmin, (req, res) => {
  const { entity, id } = req.params;
  if (!ALLOWED_ENTITIES.includes(entity)) return res.status(400).json({ error: 'Entité invalide' });
  const row = db.prepare(`SELECT * FROM ${entity} WHERE id = ?`).get(id);
  if (!row) return res.status(404).json({ error: 'Élément introuvable' });
  res.json(row);
});

app.post('/api/admin/:entity', authAdmin, (req, res) => {
  const { entity } = req.params;
  if (!ALLOWED_ENTITIES.includes(entity)) return res.status(400).json({ error: 'Entité invalide' });

  const body = { ...req.body };
  if (entity === 'admins') {
    if (!body.password) return res.status(400).json({ error: 'Mot de passe requis' });
    body.password_hash = bcrypt.hashSync(body.password, 10);
    delete body.password;
  }

  const cols = Object.keys(body).join(', ');
  const vals = Object.keys(body).map(() => '?').join(', ');
  try {
    const info = db.prepare(`INSERT INTO ${entity} (${cols}) VALUES (${vals})`).run(...Object.values(body));
    res.status(201).json({ id: info.lastInsertRowid, message: 'Créé avec succès' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/:entity/:id', authAdmin, (req, res) => {
  const { entity, id } = req.params;
  if (!ALLOWED_ENTITIES.includes(entity)) return res.status(400).json({ error: 'Entité invalide' });

  const body = { ...req.body };
  if (entity === 'admins' && body.password) {
    body.password_hash = bcrypt.hashSync(body.password, 10);
    delete body.password;
  }

  const sets = Object.keys(body).map((k) => `${k} = ?`).join(', ');
  try {
    db.prepare(`UPDATE ${entity} SET ${sets} WHERE id = ?`).run(...Object.values(body), id);
    res.json({ message: 'Mis à jour avec succès' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/:entity/:id', authAdmin, (req, res) => {
  const { entity, id } = req.params;
  if (!ALLOWED_ENTITIES.includes(entity)) return res.status(400).json({ error: 'Entité invalide' });
  try {
    db.prepare(`DELETE FROM ${entity} WHERE id = ?`).run(id);
    res.json({ message: 'Supprimé avec succès' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────
// DÉMARRAGE
// ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 OrientGuinée API démarrée sur http://localhost:${PORT}/api`);
  console.log(`📚 Endpoints disponibles :`);
  console.log(`   GET  /api/universities`);
  console.log(`   GET  /api/universities/:id`);
  console.log(`   GET  /api/jobs`);
  console.log(`   POST /api/quiz/submit`);
  console.log(`   POST /api/chat`);
  console.log(`   POST /api/auth/login`);
  console.log(`\n🔑 Admin : admin@orientguinee.gn / Admin2025!\n`);
});
