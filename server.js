require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require('connect-flash');

const app = express();

const absenceRoutes = require('./routes/absenceRoutes');

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'change_me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 3 // 3 heures
    }
}));
app.use(flash());

app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    res.locals.flashMessages = {
        success: req.flash('success'),
        error: req.flash('error')
    };
    next();
});

app.use(express.static('public'));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/', absenceRoutes);

const requestedPort = Number(process.env.PORT) || 3000;

const startServer = (port) => {
    const server = app.listen(port, () => {
        console.log(`Serveur démarré sur http://localhost:${port}`);
    });

    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.warn(`Port ${port} déjà utilisé, tentative sur ${port + 1}...`);
            server.close(() => startServer(port + 1));
            return;
        }

        console.error('Erreur démarrage serveur:', error);
        process.exit(1);
    });
};

startServer(requestedPort);
