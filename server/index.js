const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
// Charge les variables d'environnement depuis le fichier .env (ex: mot de passe, clés API)
require('dotenv').config();

// Initialisation de l'application Express
const app = express();

// ==========================================
// MIDDLEWARES (Fonctions intermédiaires)
// ==========================================
// Permet d'accepter les requêtes provenant d'autres domaines (notamment le front-end React)
app.use(cors());
// Permet de lire les données envoyées au format JSON dans le corps des requêtes (req.body)
app.use(express.json());

// ==========================================
// CONFIGURATION DE L'IA (Gemini)
// ==========================================
// Initialisation avec la clé API. Elle doit être dans ton fichier .env sous GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "VOTRE_CLE_API");

// ==========================================
// BASE DE DONNÉES (Sauvegardée dans un fichier db.json)
// ==========================================
// Chemin vers le fichier de base de données
const DB_FILE = path.join(__dirname, 'db.json');

// Base de données par défaut si le fichier n'existe pas encore
const defaultDb = {
  universities: [
    { id: 1, name: "Université Gamal Abdel Nasser de Conakry", city: "Conakry", status: "publique", founded_year: 1962 },
    { id: 2, name: "Université Général Lansana Conté de Sonfonia", city: "Conakry", status: "publique", founded_year: 2005 },
    { id: 3, name: "Université de N'Zérékoré", city: "N'Zérékoré", status: "publique", founded_year: 2001 },
    { id: 4, name: "Institut Supérieur de Technologie de Mamou", city: "Mamou", status: "publique", founded_year: 2004 },
    { id: 5, name: "Université Kofi Annan de Guinée", city: "Conakry", status: "privee", founded_year: 1999 }
  ],
  faculties: [
    { id: 1, name: "Faculté des Sciences", university_id: 1 },
    { id: 2, name: "Faculté de Droit", university_id: 2 }
  ],
  programs: [
    { id: 1, name: "Génie Logiciel", faculty_id: 1 },
    { id: 2, name: "Droit des affaires", faculty_id: 2 }
  ],
  jobs: [
    { id: 1, name: "Développeur Web", program_id: 1 },
    { id: 2, name: "Avocat d'affaires", program_id: 2 }
  ],
  resetTokens: {}
};

let db = defaultDb;

// Chargement du fichier db.json s'il existe
if (fs.existsSync(DB_FILE)) {
  try {
    const fileData = fs.readFileSync(DB_FILE, 'utf8');
    db = JSON.parse(fileData);
    console.log("Base de données chargée depuis db.json");
  } catch(e) {
    console.error("Erreur lors de la lecture de db.json, on utilise les données par défaut.", e);
  }
} else {
  // S'il n'existe pas, on le crée avec les données par défaut
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  console.log("Fichier db.json créé avec les données par défaut");
}

// Fonction pour sauvegarder les modifications dans le fichier
function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch(e) {
    console.error("Erreur lors de la sauvegarde dans db.json :", e);
  }
}

// ==========================================
// ROUTES D'AUTHENTIFICATION
// ==========================================

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (email && password) {
    res.status(200).json({ token: 'admin-fake-jwt-token-123' });
  } else {
    res.status(401).json({ error: "Identifiants invalides" });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "L'adresse email est requise." });
  }

  try {
    const token = crypto.randomBytes(20).toString('hex');
    const expires = Date.now() + 60 * 60 * 1000; 
    
    db.resetTokens[token] = { email, expires };
    saveDb(); // Sauvegarde le token

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Réinitialisation de votre mot de passe - Guide Orien',
      html: `
        <h2>Bonjour,</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe pour Guide Orien.</p>
        <p>Utilise ce lien pour réinitialiser ton mot de passe (valide 1 heure) :</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <br/>
        <p>Si tu n'as pas demandé cette réinitialisation, ignore ce message.</p>
        <br/>
        <p>L'équipe Guide Orien</p>
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Si cette adresse existe, un email de réinitialisation a été envoyé." });
  } catch (error) {
    console.error('Erreur Nodemailer:', error);
    res.status(500).json({ error: "Une erreur est survenue lors de l'envoi de l'email." });
  }
});

app.post('/api/auth/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token et nouveau mot de passe requis.' });

  const entry = db.resetTokens[token];
  if (!entry || entry.expires < Date.now()) return res.status(400).json({ error: 'Token invalide ou expiré.' });

  delete db.resetTokens[token];
  saveDb(); // Sauvegarde après suppression du token
  return res.status(200).json({ message: 'Mot de passe réinitialisé avec succès (simulation).' });
});


// ==========================================
// ROUTE DU CHATBOT IA (Assistant Virtuel)
// ==========================================
app.post('/api/chat', async (req, res) => {
  const { message } = req.body; 
  
  if (!message) {
    return res.status(400).json({ error: "Le message est requis." });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    const contextUniversities = db.universities.map(u => u.name).join(', ');
    const contextPrograms = db.programs.map(p => p.name).join(', ');
    const contextJobs = db.jobs.map(j => j.name).join(', ');

    const prompt = `Tu es l'assistant virtuel intelligent de 'Guide Orien', une plateforme d'orientation universitaire et professionnelle exclusive pour la Guinée (Conakry). Tu as le niveau de raisonnement de Gemini, mais tu es un expert absolu de l'éducation guinéenne.

CONTEXTE ÉDUCATIF GUINÉEN À RESPECTER :
- Il y a 3 profils au Baccalauréat guinéen : Sciences Mathématiques (SM), Sciences Expérimentales (SE), et Sciences Sociales (SS).
- Profil SM : Orienté vers l'ingénierie, l'informatique, les mathématiques pures, la physique.
- Profil SE : Orienté vers la médecine, la pharmacie, l'agronomie, la biologie, la chimie.
- Profil SS : Orienté vers le droit, l'économie, les lettres, la sociologie, le journalisme, l'administration.
- Les orientations officielles se font souvent via la plateforme GUPOL, mais ton rôle est d'aider l'élève à choisir SA voie avant tout.

BASE DE DONNÉES ACTUELLE DE LA PLATEFORME (pour tes recommandations) :
Universités disponibles : ${contextUniversities}
Filières disponibles : ${contextPrograms}
Métiers listés : ${contextJobs}

TES MISSIONS :
1. Si l'étudiant est perdu : demande-lui son profil de Bac (SM, SE ou SS) et ses matières préférées.
2. Analyse son profil et recommande-lui 2 ou 3 métiers pertinents.
3. Fais le lien EXPLICITE entre ces métiers et les Filières/Universités présentes dans la BASE DE DONNÉES ci-dessus.
4. Adopte un ton encourageant, tutois l'étudiant, et sois structuré (utilise des puces). Ne fais pas de réponses trop longues, sois interactif.

L'étudiant te dit : "${message}"`;

    let responseText = '';
    try {
      const result = await model.generateContent(prompt);
      
      if (result && result.response && typeof result.response.text === 'function') {
        responseText = await result.response.text();
      } else if (result && typeof result.outputText === 'string') {
        responseText = result.outputText;
      } else if (typeof result === 'string') {
        responseText = result;
      } else {
        responseText = JSON.stringify(result);
      }
    } catch (genErr) {
      console.error('Erreur génération IA:', genErr);
      responseText = "Désolé, impossible de générer une réponse pour le moment.";
    }
    
    res.status(200).json({ reply: responseText });
  } catch (error) {
    console.error('Erreur IA Chatbot:', error);
    res.status(500).json({ error: "Désolé, je rencontre des difficultés techniques en ce moment." });
  }
});


// ==========================================
// ROUTES PUBLIQUES (Données)
// ==========================================

app.get('/api/universities', (req, res) => {
  res.status(200).json({
    total: db.universities.length,
    items: db.universities
  });
});

app.get('/api/universities/:id', (req, res) => {
  const id = parseInt(req.params.id);
  
  const uni = db.universities.find(u => u.id === id);
  if (uni) {
    const faculties = db.faculties
      .filter(f => f.university_id === id)
      .map(faculty => {
        const programs = db.programs
          .filter(p => p.faculty_id === faculty.id)
          .map(program => {
            const jobs = db.jobs.filter(j => j.program_id === program.id);
            return { ...program, jobs };
          });
        return { ...faculty, programs };
      });
      
    res.status(200).json({ ...uni, faculties });
  } else {
    res.status(404).json({ error: "Université non trouvée" });
  }
});


// ==========================================
// ROUTES D'ADMINISTRATION CRUD (Create, Read, Update, Delete)
// ==========================================

app.get('/api/admin/:entity', (req, res) => {
  const entity = req.params.entity;
  res.status(200).json(db[entity] || []);
});

app.get('/api/admin/:entity/:id', (req, res) => {
  const { entity, id } = req.params;
  const numId = parseInt(id);
  
  if (!db[entity]) return res.status(404).json({ error: "Entité non trouvée" });
  
  const item = db[entity].find(u => u.id === numId);
  if (item) {
    res.status(200).json(item);
  } else {
    res.status(404).json({ error: "Élément non trouvé" });
  }
});

app.post('/api/admin/:entity', (req, res) => {
  const entity = req.params.entity;
  
  if (!db[entity]) db[entity] = [];
  
  const newItem = { id: Date.now(), ...req.body };
  
  db[entity].push(newItem);
  saveDb(); // SAUVEGARDE DANS LE FICHIER !
  
  res.status(201).json(newItem);
});

app.put('/api/admin/:entity/:id', (req, res) => {
  const { entity, id } = req.params;
  const numId = parseInt(id);
  
  if (!db[entity]) return res.status(404).json({ error: "Entité non trouvée" });

  const index = db[entity].findIndex(u => u.id === numId);
  
  if (index !== -1) {
    db[entity][index] = { ...db[entity][index], ...req.body };
    saveDb(); // SAUVEGARDE DANS LE FICHIER !
    res.status(200).json(db[entity][index]);
  } else {
    res.status(404).json({ error: "Élément non trouvé" });
  }
});

app.delete('/api/admin/:entity/:id', (req, res) => {
  const { entity, id } = req.params;
  const numId = parseInt(id);
  
  if (db[entity]) {
    db[entity] = db[entity].filter(u => u.id !== numId);
    saveDb(); // SAUVEGARDE DANS LE FICHIER !
  }
  res.status(200).json({ success: true });
});

// ==========================================
// DÉMARRAGE DU SERVEUR
// ==========================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Serveur backend démarré sur le port ${PORT}`);
});
