const express = require('express');
const router = express.Router();
const { getAllTanks, createTank, updateTank } = require('../controllers/tankController');
const { createSale, getStats } = require('../controllers/saleController');
const { verifyToken, verifyRole } = require('../middlewares/authMiddleware');

// === Routes Réservoirs ===
// Tout le monde connecté peut voir les réservoirs
router.get('/tanks', verifyToken, getAllTanks);
// Seul l'admin peut créer ou modifier les caractéristiques du réservoir
router.post('/tanks', verifyToken, verifyRole('Admin'), createTank);
router.put('/tanks/:id', verifyToken, verifyRole('Admin'), updateTank);

// === Routes Ventes ===
// Tout le monde connecté (Caissier, Admin) peut créer une vente
router.post('/sales', verifyToken, createSale);
// Historique des ventes (Admin uniquement)
router.get('/sales/history', verifyToken, verifyRole('Admin'), require('../controllers/saleController').getSalesHistory);
// Stats du dashboard
router.get('/stats', verifyToken, getStats);

// === Routes Utilisateurs (Employés) ===
const { getUsers, createUser, deleteUser } = require('../controllers/userController');
router.get('/users', verifyToken, verifyRole('Admin'), getUsers);
router.post('/users', verifyToken, verifyRole('Admin'), createUser);
router.delete('/users/:id', verifyToken, verifyRole('Admin'), deleteUser);

module.exports = router;
