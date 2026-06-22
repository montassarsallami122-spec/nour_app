// Wrapper autour du module SQLite intégré à Node 24 (aucune compilation native requise).
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

export const db = new DatabaseSync(config.dbPath);

// Description du schéma envoyée au LLM pour générer le SQL.
// On documente chaque colonne pour que GPT-4o écrive des requêtes correctes.
export const SCHEMA_DESCRIPTION = `
Base de données SQLite (dialecte SQLite). Deux tables.

TABLE employees -- un employé par ligne (matricule unique)
  matricule INTEGER        -- identifiant unique de l'employé (clé)
  rang INTEGER
  sexe INTEGER             -- 1 ou 2 (code de sexe)
  date_naissance TEXT      -- date ISO 'YYYY-MM-DD' (peut être NULL)
  age INTEGER              -- âge en années
  adresse1 TEXT
  adresse2 TEXT
  adresse3 TEXT
  societe TEXT             -- ex: 'MEDNA'
  departement TEXT         -- code du département, ex: 'DG','SUP','IM','AQ','CQ'
  num_contrat TEXT
  nature_contrat TEXT      -- ex: 'CDI','CDD'
  date_contrat TEXT        -- date ISO 'YYYY-MM-DD' (NULL possible)
  fonction TEXT            -- intitulé du poste
  qualification TEXT       -- ex: 'Cadre','Maîtrise','Exécution'
  date_debut_dernier_contrat TEXT  -- date ISO 'YYYY-MM-DD' (NULL si non renseignée)
  date_fin TEXT            -- date ISO de fin de contrat (NULL = toujours en poste / non renseignée)
  centre_de_cout TEXT

TABLE absences -- une absence par ligne (plusieurs par employé)
  matricule INTEGER        -- référence employees.matricule
  date_debut TEXT          -- date ISO 'YYYY-MM-DD' de début d'absence
  date_fin TEXT            -- date ISO 'YYYY-MM-DD' de fin d'absence
  motif TEXT               -- motif/raison de l'absence, ex: 'CPE' (congé payé), 'MAL' (maladie)...
  nbr_jours REAL           -- nombre de jours d'absence
  nbr_heures REAL          -- nombre d'heures d'absence
  obs TEXT                 -- observation libre

Relation: absences.matricule = employees.matricule (jointure pour croiser absences et infos employé).
Notes:
- Les dates sont au format texte ISO 'YYYY-MM-DD' -> comparables avec des chaînes ('2024-01-01').
- IMPORTANT: il n'existe AUCUNE colonne nom/prénom. Un employé est identifié par son 'matricule' (et éventuellement 'fonction', 'departement'). N'utilise jamais une colonne "nom".
- Pour le sexe, n'utilise que les valeurs 1 ou 2 (ne suppose pas de libellé).
`.trim();

export function initSchema(): void {
  db.exec(`
    DROP TABLE IF EXISTS employees;
    DROP TABLE IF EXISTS absences;
    CREATE TABLE employees (
      matricule INTEGER,
      rang INTEGER,
      sexe INTEGER,
      date_naissance TEXT,
      age INTEGER,
      adresse1 TEXT,
      adresse2 TEXT,
      adresse3 TEXT,
      societe TEXT,
      departement TEXT,
      num_contrat TEXT,
      nature_contrat TEXT,
      date_contrat TEXT,
      fonction TEXT,
      qualification TEXT,
      date_debut_dernier_contrat TEXT,
      date_fin TEXT,
      centre_de_cout TEXT
    );
    CREATE TABLE absences (
      matricule INTEGER,
      date_debut TEXT,
      date_fin TEXT,
      motif TEXT,
      nbr_jours REAL,
      nbr_heures REAL,
      obs TEXT
    );
    CREATE INDEX idx_emp_mat ON employees(matricule);
    CREATE INDEX idx_abs_mat ON absences(matricule);
  `);
}
