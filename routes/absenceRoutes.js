const express = require('express');
const router = express.Router();

const upload = require('../middlewares/uploadMiddleware');
const absenceController = require('../controllers/absenceController');
const chatController = require('../controllers/chatController');
const authController = require('../controllers/authController');

const ensureAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    return res.redirect('/login');
};

const ensureRole = (role) => (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === role) {
        return next();
    }
    req.flash('error', 'Accès réservé au directeur.');
    return res.redirect('/');
};

router.get('/login', authController.loginPage);
router.post('/login', authController.login);
router.get('/register', authController.registerPage);
router.post('/register', authController.register);
router.get('/forgot-password', authController.forgotPasswordPage);
router.post('/forgot-password', authController.resetPassword);
router.get('/logout', authController.logout);

router.get('/', ensureAuthenticated, absenceController.homePage);
router.get('/chat', ensureAuthenticated, chatController.chatPage);

router.post(
    '/absence',
    ensureAuthenticated,
    upload.single('justificatif'),
    absenceController.createAbsence
);

router.post('/chat', ensureAuthenticated, chatController.chatMessage);
router.post('/chat/message', ensureAuthenticated, chatController.chatMessage);

router.get('/historique', ensureAuthenticated, absenceController.historique);
router.post('/absence/valider/:id', ensureAuthenticated, ensureRole('directeur'), absenceController.validateAbsence);
router.post('/absence/refuser/:id', ensureAuthenticated, ensureRole('directeur'), absenceController.refuseAbsence);
router.post('/absence/supprimer/:id', ensureAuthenticated, absenceController.deleteAbsence);

module.exports = router;
