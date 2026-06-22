// Chatbot HARD-SCOPED par employé.
//
// Principe de sécurité : on n'essaie PAS de faire confiance au prompt du LLM
// pour qu'il ne lise que les données du bon matricule. À la place, on ouvre une
// connexion SQLite ISOLÉE (en mémoire) qui ne contient QUE les lignes de cet
// employé, puis on y exécute le SQL généré par le LLM.
//
//   1) nouvelle connexion :memory:  (vide)
//   2) ATTACH de la base réelle en lecture seule (alias `src`)
//   3) CREATE TEMP TABLE employees/absences = uniquement les lignes du matricule
//   4) DETACH src  -> la base réelle devient totalement injoignable
//
// Résultat : même un `SELECT * FROM employees` ne renvoie que SA ligne. Il
// n'existe aucun chemin pour atteindre les autres employés depuis cette connexion.
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';
import { answerQuestion, type ChatResult, type SqlRunner } from './chat.js';

function openScopedDb(matricule: number): { run: SqlRunner; close: () => void } {
  // matricule provient du jeton de session vérifié et est forcé en entier :
  // aucune injection possible (valeur strictement numérique).
  const mat = Math.trunc(Number(matricule));
  if (!Number.isFinite(mat)) throw new Error('Matricule invalide.');

  const sdb = new DatabaseSync(':memory:');
  // ATTACH en lecture seule via URI (mode=ro) pour ne jamais toucher la vraie base.
  const path = config.dbPath.replace(/\\/g, '/');
  sdb.exec(`ATTACH DATABASE 'file:${path}?mode=ro' AS src`);
  sdb.exec(`CREATE TEMP TABLE employees AS SELECT * FROM src.employees WHERE matricule = ${mat}`);
  sdb.exec(`CREATE TEMP TABLE absences  AS SELECT * FROM src.absences  WHERE matricule = ${mat}`);
  sdb.exec('DETACH DATABASE src'); // la base réelle n'est plus accessible

  return {
    run: sdb as unknown as SqlRunner,
    close: () => sdb.close(),
  };
}

export async function answerQuestionScoped(question: string, matricule: number): Promise<ChatResult> {
  const scoped = openScopedDb(matricule);
  try {
    return await answerQuestion(question, scoped.run);
  } finally {
    scoped.close();
  }
}
