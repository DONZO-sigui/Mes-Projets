CREATE DATABASE chatbot_absence;

CREATE TABLE absences (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100),
    date_absence DATE,
    motif TEXT,
    justificatif VARCHAR(255)
);
