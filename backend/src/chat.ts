// Pipeline "chatbot sur tes données" en Text-to-SQL :
//   1) GPT-4o traduit la question en une requête SQLite (SELECT uniquement)
//   2) on valide + exécute la requête en lecture seule
//   3) GPT-4o reformule le résultat en réponse naturelle
import { db, SCHEMA_DESCRIPTION } from './db.js';
import { llm, MODEL } from './llm.js';

// Interface minimale d'une connexion SQLite (le vrai `db` ou une connexion
// isolée par employé — voir scoped.ts). Permet d'exécuter le même pipeline
// text-to-SQL sur des données restreintes sans dupliquer le code.
export interface SqlRunner {
  prepare(sql: string): { all(...p: unknown[]): unknown[] };
}

const MAX_ROWS = 200; // limite de lignes renvoyées au modèle (contrôle des tokens/coût)

export interface ChatResult {
  answer: string;
  sql: string;
  rowCount: number;
  rows: unknown[];
}

// --- Garde-fou : la requête doit être strictement en lecture seule -------------
const FORBIDDEN = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|REPLACE|ATTACH|DETACH|PRAGMA|VACUUM|REINDEX|TRIGGER)\b/i;

function assertReadOnly(sql: string): string {
  const trimmed = sql.trim().replace(/;\s*$/, ''); // enlève le ; final éventuel
  if (trimmed.includes(';')) throw new Error('Une seule requête est autorisée.');
  if (!/^(SELECT|WITH)\b/i.test(trimmed)) throw new Error('Seules les requêtes SELECT sont autorisées.');
  if (FORBIDDEN.test(trimmed)) throw new Error('Mot-clé interdit détecté (lecture seule uniquement).');
  return trimmed;
}

const SQL_SYSTEM_PROMPT =
  `Tu es un expert SQLite. À partir du schéma ci-dessous, traduis la question de l'utilisateur ` +
  `en UNE seule requête SQLite en LECTURE SEULE (SELECT ou WITH). ` +
  `N'invente pas de colonnes ; utilise uniquement celles du schéma. ` +
  `Limite les résultats volumineux avec LIMIT ${MAX_ROWS}. ` +
  `Réponds STRICTEMENT en JSON: {"sql": "..."}.\n\nSCHÉMA:\n${SCHEMA_DESCRIPTION}`;

// --- Étape 1 : question -> SQL --------------------------------------------------
// `errorContext` permet de demander une correction après une requête en échec.
async function questionToSql(question: string, errorContext?: { sql: string; error: string }): Promise<string> {
  const userContent = errorContext
    ? `Question: ${question}\n\nLa requête précédente a échoué:\n${errorContext.sql}\n\n` +
      `Erreur SQLite: ${errorContext.error}\nCorrige la requête en respectant strictement le schéma.`
    : question;

  const completion = await llm.chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SQL_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? '{}';
  let parsed: { sql?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Le modèle n\'a pas renvoyé de JSON valide.');
  }
  if (!parsed.sql) throw new Error('Aucune requête SQL générée.');
  return parsed.sql;
}

// --- Étape 3 : résultat -> réponse naturelle -----------------------------------
async function sqlResultToAnswer(question: string, sql: string, rows: unknown[]): Promise<string> {
  const completion = await llm.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content:
          `Tu es un assistant RH. Réponds à la question de l'utilisateur en français, de façon claire et concise, ` +
          `en te basant UNIQUEMENT sur les résultats SQL fournis. ` +
          `Si le résultat est vide, dis qu'aucune donnée ne correspond. ` +
          `N'invente jamais de chiffres. Tu peux présenter sous forme de liste ou de tableau si pertinent.`,
      },
      {
        role: 'user',
        content:
          `Question: ${question}\n\nRequête SQL exécutée:\n${sql}\n\n` +
          `Résultats (JSON, max ${MAX_ROWS} lignes):\n${JSON.stringify(rows).slice(0, 12000)}`,
      },
    ],
  });
  return completion.choices[0]?.message?.content ?? 'Désolé, je n\'ai pas pu formuler de réponse.';
}

// --- Orchestration --------------------------------------------------------------
// `runner` permet d'exécuter la requête contre une connexion restreinte (un seul
// employé). Par défaut on utilise la base complète (mode admin).
export async function answerQuestion(question: string, runner: SqlRunner = db): Promise<ChatResult> {
  let sql = assertReadOnly(await questionToSql(question));
  let rows: unknown[] | null = null;
  let lastError = '';

  // Tentative initiale + 1 auto-correction si la requête échoue à l'exécution.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      rows = runner.prepare(sql).all();
      break;
    } catch (e) {
      lastError = (e as Error).message;
      if (attempt === 0) {
        sql = assertReadOnly(await questionToSql(question, { sql, error: lastError }));
      }
    }
  }

  if (rows === null) {
    throw new Error(`Erreur d'exécution SQL: ${lastError}`);
  }

  const limited = rows.slice(0, MAX_ROWS);
  const answer = await sqlResultToAnswer(question, sql, limited);

  return { answer, sql, rowCount: rows.length, rows: limited };
}
