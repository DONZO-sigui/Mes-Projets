const absenceModel = require('../models/absenceModel');

const homePage = async (req, res) => {
    try {
        const currentUser = req.session && req.session.user ? req.session.user : null;
        let pendingAbsences = [];
        
        if (currentUser && currentUser.role === 'directeur') {
            pendingAbsences = await absenceModel.getPendingAbsences();
        }
        
        res.render('index', {
            currentUser,
            pendingAbsences
        });
    } catch (error) {
        console.log(error);
        res.send('Erreur serveur');
    }
};

const createAbsence = async (req, res) => {
    try {
        const currentUser = req.session && req.session.user ? req.session.user : null;
        const data = {
            nom: req.body.nom || (currentUser ? currentUser.username : 'Inconnu'),
            matricule: req.body.matricule || null,
            filiere: req.body.filiere || null,
            niveau_etude: req.body.niveau_etude || null,
            date_absence: req.body.date_absence,
            motif: req.body.motif,
            justificatif: req.file ? req.file.filename : null,
            statut: 'en_attente',
            declarant: currentUser ? currentUser.username : 'Inconnu',
            valide_par: null
        };

        await absenceModel.createAbsence(data);
        req.flash('success', 'Absence enregistrée avec succès.');
        res.redirect('/historique');

    } catch (error) {
        console.log(error);
        res.send('Erreur serveur');
    }
};

const historique = async (req, res) => {
    try {
        const selectedId = req.query.id ? Number(req.query.id) : null;
        const currentUser = req.session && req.session.user ? req.session.user : null;
        
        let absences = [];
        if (currentUser) {
            if (currentUser.role === 'directeur') {
                absences = await absenceModel.getAllAbsences();
            } else {
                absences = await absenceModel.getAbsencesByDeclarant(currentUser.username);
            }
        }

        let selectedAbsence = selectedId ? await absenceModel.getAbsenceById(selectedId) : null;
        
        if (selectedAbsence && currentUser && currentUser.role !== 'directeur' && selectedAbsence.declarant !== currentUser.username) {
            selectedAbsence = null;
        }

        res.render('historique', {
            absences,
            selectedAbsence,
            currentUser
        });

    } catch (error) {
        console.log(error);
        res.send('Erreur');
    }
};

const validateAbsence = async (req, res) => {
    try {
        if (!req.session || !req.session.user || req.session.user.role !== 'directeur') {
            return res.redirect('/login');
        }

        const absenceId = Number(req.params.id);
        await absenceModel.validateAbsence(absenceId, req.session.user.username);

        req.flash('success', 'Absence validée avec succès.');
        return res.redirect('back');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Impossible de valider cette absence.');
        return res.redirect('back');
    }
};

const refuseAbsence = async (req, res) => {
    try {
        if (!req.session || !req.session.user || req.session.user.role !== 'directeur') {
            return res.redirect('/login');
        }

        const absenceId = Number(req.params.id);
        await absenceModel.refuseAbsence(absenceId, req.session.user.username);

        req.flash('success', 'Absence refusée.');
        return res.redirect('back');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Impossible de refuser cette absence.');
        return res.redirect('back');
    }
};

const deleteAbsence = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.redirect('/login');
        }

        const absenceId = Number(req.params.id);
        
        // Optionally, one could check if the student deleting is the owner or if the teacher is deleting.
        // For now, we allow the deletion.
        await absenceModel.deleteAbsence(absenceId);

        req.flash('success', 'Absence supprimée avec succès.');
        return res.redirect('back');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Impossible de supprimer cette absence.');
        return res.redirect('back');
    }
};

module.exports = {
    homePage,
    createAbsence,
    historique,
    validateAbsence,
    refuseAbsence,
    deleteAbsence
};
