require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const initializeDatabase = require('./config/initDb');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api', require('./routes/apiRoutes'));

app.get('/', (req, res) => {
    res.json({
        message: 'Station Manager Pro API'
    });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await initializeDatabase();
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Impossible de démarrer le serveur :', error.message);
        process.exit(1);
    }
}

startServer();
