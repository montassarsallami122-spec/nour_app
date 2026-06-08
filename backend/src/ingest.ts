// Ingestion : CSV employés + XLSX absences -> SQLite.
// Lancer avec : npm run ingest
import { readFileSync } from 'node:fs';
import XLSX from 'xlsx';
import { config } from './config.js';
import { db, initSchema } from './db.js';

// Parser CSV RFC-4180 minimal (gère les champs entre guillemets et les "" échappés).
function parseCsv(text: string): Record<string, string>[] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n') {
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift() ?? [];
  return rows.map((r) => {
    const o: Record<string, string> = {};
    header.forEach((h, idx) => { o[h] = r[idx] ?? ''; });
    return o;
  });
}

// Date "min" SQL Server (1753-01-01) utilisée comme valeur sentinelle = NULL.
const SENTINEL = '1753-01-01';

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === '' ) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function clean(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

// "7/27/1954" (M/D/YYYY) ou "1753-01-01 00:00:00.000" -> 'YYYY-MM-DD' ou null
function parseUsDate(v: unknown): string | null {
  const s = clean(v);
  if (!s) return null;
  // déjà ISO ?
  const iso = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return iso.startsWith(SENTINEL) ? null : iso;
  }
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const [, mm, dd, yyyy] = m;
  const out = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  return out.startsWith(SENTINEL) ? null : out;
}

// Date JS (lecture xlsx cellDates) -> 'YYYY-MM-DD'
function jsDateToIso(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  // fallback si c'est un nombre de série Excel
  if (typeof v === 'number') {
    const d = XLSX.SSF ? XLSX.SSF.parse_date_code(v) : null;
    if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  return parseUsDate(v);
}

function ingestEmployees(): number {
  console.log(`Lecture employés: ${config.employeesCsv}`);
  const text = readFileSync(config.employeesCsv, 'utf8');
  const rows = parseCsv(text);

  const stmt = db.prepare(`INSERT INTO employees
    (matricule, rang, sexe, date_naissance, age, adresse1, adresse2, adresse3, societe,
     departement, num_contrat, nature_contrat, date_contrat, fonction, qualification,
     date_debut_dernier_contrat, date_fin, centre_de_cout)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  db.exec('BEGIN');
  for (const r of rows) {
    stmt.run(
      toNum(r['Matricule']),
      toNum(r['Rang']),
      toNum(r['SEX']),
      parseUsDate(r['DATENAISSANCE']),
      toNum(r['Age']),
      clean(r['ADD1']),
      clean(r['ADD2']),
      clean(r['ADD3']),
      clean(r['Société'] ?? r['Societe'] ?? r['société']),
      clean(r['Departement']),
      clean(r['Num_Contrat']),
      clean(r['Nature_Contrat']),
      parseUsDate(r['Date_Contrat']),
      clean(r['Fonction']),
      clean(r['Qualification']),
      parseUsDate(r['date_debut_dernier_contrat']),
      parseUsDate(r['DateFin']),
      clean(r['Centre_de_Cout'])
    );
  }
  db.exec('COMMIT');
  return rows.length;
}

function ingestAbsences(): number {
  console.log(`Lecture absences: ${config.absencesXlsx}`);
  const wb = XLSX.readFile(config.absencesXlsx, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: null });

  const stmt = db.prepare(`INSERT INTO absences
    (matricule, date_debut, date_fin, motif, nbr_jours, nbr_heures, obs)
    VALUES (?,?,?,?,?,?,?)`);

  db.exec('BEGIN');
  for (const r of rows) {
    stmt.run(
      toNum(r['MAT']),
      jsDateToIso(r['DATE DEBUT']),
      jsDateToIso(r['DATE FIN']),
      clean(r["Motif  d'abscence"]),
      toNum(r['NBRDAY']),
      toNum(r['NBRHOU']),
      clean(r['OBS'])
    );
  }
  db.exec('COMMIT');
  return rows.length;
}

function main() {
  if (!config.employeesCsv || !config.absencesXlsx) {
    throw new Error('Définir EMPLOYEES_CSV et ABSENCES_XLSX dans .env');
  }
  initSchema();
  const e = ingestEmployees();
  const a = ingestAbsences();
  const empCount = db.prepare('SELECT COUNT(*) AS c FROM employees').get() as { c: number };
  const absCount = db.prepare('SELECT COUNT(*) AS c FROM absences').get() as { c: number };
  console.log(`\n✅ Ingestion terminée`);
  console.log(`   employees : ${e} lues -> ${empCount.c} en base`);
  console.log(`   absences  : ${a} lues -> ${absCount.c} en base`);
  db.close();
}

main();
