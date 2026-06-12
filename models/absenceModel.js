const db = require('../config/db');

const createAbsence = async (data) => {
    const query = `
        INSERT INTO absences
        (nom, matricule, filiere, niveau_etude, date_absence, motif, justificatif, statut, declarant, valide_par)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        data.nom,
        data.matricule || null,
        data.filiere || null,
        data.niveau_etude || null,
        data.date_absence,
        data.motif,
        data.justificatif,
        data.statut || 'en_attente',
        data.declarant || 'Inconnu',
        data.valide_par || null
    ];

    const result = await db.query(query, values);

    return result.rows[0];
};

const getAllAbsences = async () => {
    const result = await db.query(
        'SELECT * FROM absences ORDER BY id DESC'
    );

    return result.rows;
};

const getAbsencesByDeclarant = async (username) => {
    const result = await db.query(
        'SELECT * FROM absences WHERE declarant = ? ORDER BY id DESC',
        [username]
    );

    return result.rows;
};

const getAbsenceById = async (id) => {
    const result = await db.query('SELECT * FROM absences WHERE id = ?', [id]);
    return result.rows[0] || null;
};

const getPendingAbsences = async () => {
    const result = await db.query(
        'SELECT * FROM absences WHERE statut = ? ORDER BY id DESC',
        ['en_attente']
    );

    return result.rows;
};

const validateAbsence = async (id, validatedBy) => {
    const result = await db.query(
        'UPDATE absences SET statut = ?, valide_par = ?, date_validation = ? WHERE id = ?',
        ['validee', validatedBy, new Date().toISOString(), id]
    );

    return result.rows;
};

const refuseAbsence = async (id, validatedBy) => {
    const result = await db.query(
        'UPDATE absences SET statut = ?, valide_par = ?, date_validation = ? WHERE id = ?',
        ['refusee', validatedBy, new Date().toISOString(), id]
    );

    return result.rows;
};

const deleteAbsence = async (id) => {
    const result = await db.query(
        'DELETE FROM absences WHERE id = ?',
        [id]
    );

    return result.rows;
};

module.exports = {
    createAbsence,
    getAllAbsences,
    getAbsencesByDeclarant,
    getAbsenceById,
    getPendingAbsences,
    validateAbsence,
    refuseAbsence,
    deleteAbsence
};
