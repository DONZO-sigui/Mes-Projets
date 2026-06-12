const absenceModel = require('../models/absenceModel');
const chatModel = require('../models/chatModel');

const processMessage = async (message) => {
    const text = message ? message.trim().toLowerCase() : '';

    if (!text) {
        return 'Salut ! Je suis ton assistant d’absence. Pose-moi une question ou demande comment déclarer une absence.';
    }

    if (/^(bonjour|salut|hello|hey)/i.test(text)) {
        return 'Bonjour ! Je peux t’aider à déclarer une absence, à consulter l’historique ou à répondre à des questions sur le fonctionnement.';
    }

    if (/déclar.*absence|nouvelle absence|soumettre.*absence|faire.*absence/.test(text)) {
        return 'Pour déclarer une absence, rends-toi sur la page d’accueil, remplis le formulaire avec ton nom, la date, le motif et ajoute un justificatif si besoin.';
    }

    if (/historique|voir historique|liste des absences|mes absences/.test(text)) {
        return 'Tu peux consulter toutes les absences enregistrées sur la page Historique.';
    }

    if (/combien.*absences|nombre.*absences|total.*absences/.test(text)) {
        const absences = await absenceModel.getAllAbsences();
        return `Il y a actuellement ${absences.length} absences enregistrées.`;
    }

    if (/motif|pourquoi|raison/.test(text)) {
        return 'Le motif doit expliquer pourquoi l’absence a eu lieu. Tu peux le saisir librement dans le formulaire.';
    }

    if (/fichier|justificatif|pièce/.test(text)) {
        return 'Tu peux ajouter un justificatif en téléchargeant un fichier depuis le formulaire lorsque tu déclares une absence.';
    }

    if (/merci|ok|d accord|cool/.test(text)) {
        return 'Avec plaisir ! Si tu veux, je peux aussi t’expliquer comment modifier ou supprimer une absence.';
    }

    return 'Je ne comprends pas bien ta question. Essaie quelque chose comme « Comment déclarer une absence ? » ou « Voir historique ». ';
};

const chatMessage = async (req, res) => {
    try {
        const userMessage = (req.body.message || '').toString().trim();
        const currentUser = req.session && req.session.user ? req.session.user : null;
        
        if (currentUser && userMessage) {
            await chatModel.saveMessage(currentUser.username, 'user', userMessage);
        }

        const reply = await processMessage(userMessage);

        if (currentUser && reply) {
            await chatModel.saveMessage(currentUser.username, 'bot', reply);
        }

        return res.json({ reply });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ reply: 'Erreur serveur' });
    }
};

const chatPage = async (req, res) => {
    try {
        const currentUser = req.session && req.session.user ? req.session.user : null;
        let chatHistory = [];
        
        if (currentUser) {
            chatHistory = await chatModel.getMessagesByUsername(currentUser.username);
        }

        res.render('chat', { currentUser, chatHistory });
    } catch (error) {
        console.error(error);
        res.status(500).send('Erreur serveur');
    }
};

const sendMessage = async (req, res) => {
    try {
        const { message } = req.body;
        const reply = await processMessage(message);
        res.json({ reply });
    } catch (error) {
        console.error(error);
        res.status(500).json({ reply: 'Désolé, une erreur est survenue. Réessaie dans un instant.' });
    }
};

module.exports = {
    processMessage,
    chatMessage,
    chatPage,
    sendMessage
};
