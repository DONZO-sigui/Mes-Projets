const db = require('../config/db');

const saveMessage = async (username, sender, message) => {
    const query = `
        INSERT INTO chat_messages (username, sender, message)
        VALUES (?, ?, ?)
    `;
    const result = await db.query(query, [username, sender, message]);
    return result;
};

const getMessagesByUsername = async (username) => {
    const query = `
        SELECT * FROM chat_messages 
        WHERE username = ? 
        ORDER BY id ASC
    `;
    const result = await db.query(query, [username]);
    return result.rows;
};

module.exports = {
    saveMessage,
    getMessagesByUsername
};
