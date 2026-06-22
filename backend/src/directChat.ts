// MODE DIRECT : on fournit à GPT-4o un contexte de données (panorama complet +
// lignes brutes liées à la question) et GPT-4o répond librement, SANS générer de SQL.
//
// Pourquoi un panorama + lignes ciblées plutôt que TOUTES les lignes ?
//   2 930 employés + 57 425 absences ≈ 2 M+ tokens > limite 128k de GPT-4o.
//   On donne donc : (1) des agrégats exacts (calculés ici, pas par le modèle),
//   (2) toutes les lignes brutes des matricules cités dans la question.
import { db } from './db.js';
import { llm, MODEL } from './llm.js';

export interface DirectResult {
  answer: string;
  mode: 'direct';
  contextChars: number;
}

type Row = Record<string, unknown>;
const all = (sql: string, ...p: (string | number | null)[]): Row[] => db.prepare(sql).all(...p) as Row[];
const one = (sql: string, ...p: (string | number | null)[]): Row => db.prepare(sql).get(...p) as Row;
const fmtCounts = (rows: Row[], k: string, v = 'c') =>
  rows.map((r) => `${r[k] ?? '(vide)'}: ${r[v]}`).join(', ');

// Panorama global des données — calculé une seule fois puis mis en cache.
let cachedSnapshot: string | null = null;

function buildSnapshot(): string {
  if (cachedSnapshot) return cachedSnapshot;

  const empTotal = one('SELECT COUNT(*) c FROM employees').c;
  const bySexe = all('SELECT sexe, COUNT(*) c FROM employees GROUP BY sexe ORDER BY sexe');
  const byDept = all('SELECT departement, COUNT(*) c FROM employees GROUP BY departement ORDER BY c DESC');
  const byQual = all('SELECT qualification, COUNT(*) c FROM employees GROUP BY qualification ORDER BY c DESC');
  const byContrat = all('SELECT nature_contrat, COUNT(*) c FROM employees GROUP BY nature_contrat ORDER BY c DESC');
  const bySociete = all('SELECT societe, COUNT(*) c FROM employees GROUP BY societe ORDER BY c DESC');
  const byCentre = all('SELECT centre_de_cout, COUNT(*) c FROM employees GROUP BY centre_de_cout ORDER BY c DESC');
  const age = one('SELECT MIN(age) mn, MAX(age) mx, ROUND(AVG(age),1) avg FROM employees WHERE age IS NOT NULL');
  const sortis = one('SELECT COUNT(*) c FROM employees WHERE date_fin IS NOT NULL');

  const absTotal = one('SELECT COUNT(*) c FROM absences').c;
  const byMotif = all(
    `SELECT motif, COUNT(*) nb, ROUND(SUM(nbr_jours),2) jours, ROUND(SUM(nbr_heures),2) heures
     FROM absences GROUP BY motif ORDER BY nb DESC`
  );
  const absTot = one('SELECT ROUND(SUM(nbr_jours),2) j, ROUND(SUM(nbr_heures),2) h FROM absences');
  const absRange = one('SELECT MIN(date_debut) mn, MAX(date_fin) mx FROM absences');
  const empAvecAbs = one('SELECT COUNT(DISTINCT matricule) c FROM absences').c;
  const absByYear = all(
    `SELECT substr(date_debut,1,4) annee, COUNT(*) nb, ROUND(SUM(nbr_jours),2) jours, ROUND(SUM(nbr_heures),2) heures
     FROM absences WHERE date_debut IS NOT NULL GROUP BY annee ORDER BY annee`
  );
  const absByCentre = all(
    `SELECT e.centre_de_cout, COUNT(*) nb, ROUND(SUM(a.nbr_jours),2) jours
     FROM absences a LEFT JOIN employees e ON e.matricule = a.matricule
     GROUP BY e.centre_de_cout ORDER BY jours DESC LIMIT 15`
  );
  const topAbs = all(
    `SELECT a.matricule, e.fonction, e.departement, COUNT(*) nb, ROUND(SUM(a.nbr_jours),2) jours
     FROM absences a LEFT JOIN employees e ON e.matricule = a.matricule
     GROUP BY a.matricule ORDER BY jours DESC LIMIT 15`
  );

  cachedSnapshot = `
=== PANORAMA EMPLOYÉS ===
Total employés: ${empTotal}
Répartition par sexe (code): ${fmtCounts(bySexe, 'sexe')}
Par département: ${fmtCounts(byDept, 'departement')}
Par qualification: ${fmtCounts(byQual, 'qualification')}
Par nature de contrat: ${fmtCounts(byContrat, 'nature_contrat')}
Par société: ${fmtCounts(bySociete, 'societe')}
Par centre de coût (nb d'employés): ${fmtCounts(byCentre, 'centre_de_cout')}
Âge: min ${age.mn}, max ${age.mx}, moyenne ${age.avg}
Employés avec date de fin de contrat renseignée (sortis): ${sortis.c}

=== PANORAMA ABSENCES ===
Total enregistrements d'absence: ${absTotal}
Total jours d'absence (tous): ${absTot.j} | Total heures: ${absTot.h}
Période couverte: ${absRange.mn} -> ${absRange.mx}
Employés ayant au moins une absence: ${empAvecAbs}
Par motif (nb d'absences | jours | heures):
${byMotif.map((m) => `  - ${m.motif}: ${m.nb} absences, ${m.jours} jours, ${m.heures} heures`).join('\n')}
Par année (nb d'absences | jours | heures):
${absByYear.map((y) => `  - ${y.annee}: ${y.nb} absences, ${y.jours} jours, ${y.heures} heures`).join('\n')}
Top 15 centres de coût par jours d'absence (centre | nb | jours):
${absByCentre.map((c) => `  - ${c.centre_de_cout ?? '?'} | ${c.nb} | ${c.jours}`).join('\n')}
Top 15 des plus absents (matricule | fonction | dept | nb | jours):
${topAbs.map((t) => `  - ${t.matricule} | ${t.fonction ?? '?'} | ${t.departement ?? '?'} | ${t.nb} | ${t.jours}`).join('\n')}
`.trim();

  return cachedSnapshot;
}

// Charge les lignes brutes des matricules mentionnés dans la question.
function buildDetail(question: string): string {
  const mats = [...question.matchAll(/\b(\d{4,6})\b/g)].map((m) => Number(m[1]));
  const uniq = [...new Set(mats)].slice(0, 5);
  if (uniq.length === 0) return '';

  let out = '\n\n=== DÉTAIL DES EMPLOYÉS MENTIONNÉS (lignes brutes) ===';
  for (const mat of uniq) {
    const emp = db.prepare('SELECT * FROM employees WHERE matricule = ?').get(mat) as Row | undefined;
    if (!emp) {
      out += `\nMatricule ${mat}: introuvable dans la base.`;
      continue;
    }
    const abs = all(
      `SELECT date_debut, date_fin, motif, nbr_jours, nbr_heures, obs
       FROM absences WHERE matricule = ? ORDER BY date_debut`,
      mat
    );
    out += `\n\nEmployé ${mat}:\n${JSON.stringify(emp)}\nSes absences (${abs.length}):\n${JSON.stringify(abs).slice(0, 6000)}`;
  }
  return out;
}

export async function answerQuestionDirect(question: string): Promise<DirectResult> {
  const context = buildSnapshot() + buildDetail(question);

  const completion = await llm.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content:
          `Tu es un assistant RH. Réponds à l'utilisateur en français, de façon claire ` +
          `(listes/tableaux si utile), en t'appuyant UNIQUEMENT sur les DONNÉES ci-dessous. ` +
          `N'invente JAMAIS un chiffre : si l'information n'est pas dans les données fournies, ` +
          `dis-le et précise quelle information manque. Les données employés n'ont pas de nom/prénom ` +
          `(un employé est identifié par son matricule).\n\nDONNÉES:\n${context}`,
      },
      { role: 'user', content: question },
    ],
  });

  return {
    answer: completion.choices[0]?.message?.content ?? 'Désolé, je n\'ai pas pu répondre.',
    mode: 'direct',
    contextChars: context.length,
  };
}
