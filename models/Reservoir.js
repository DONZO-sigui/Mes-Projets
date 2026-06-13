const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Reservoir = sequelize.define('Reservoir', {
    nom: DataTypes.STRING,
    capacite: DataTypes.FLOAT,
    niveau: DataTypes.FLOAT,
    prix_vente: DataTypes.FLOAT
});

module.exports = Reservoir;
