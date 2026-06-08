// Agrégations pour le tableau de bord RH.
// Même principe que directChat.ts : tous les calculs sont faits par SQLite
// (chiffres exacts), on renvoie un JSON prêt à dessiner côté frontend.
import { db } from './db.js';

type Row = Record<string, unknown>;
const all = (sql: string, ...p: unknown[]): Row[] => db.prepare(sql).all(...p) as Row[];
const one = (sql: string, ...p: unknown[]): Row => db.prepare(sql).get(...p) as Row;

// Format générique pour les graphiques : { label, value, extra? }
export interface Slice {
  label: string;
  value: number;
  extra?: number; // ex: jours d'absence en plus du nombre
}

export interface Stats {
  kpis: {
    employees: number;
    active: number;
    departed: number;
    avgAge: number;
    absenceRecords: number;
    absenceDays: number;
    employeesWithAbsence: number;
    absenteeismRate: number; // % d'employés ayant au moins une absence
  };
  byDepartment: Slice[];
  byMotif: Slice[];
  byYear: Slice[];
  byGender: Slice[];
  byContract: Slice[];
  byQualification: Slice[];
  topAbsentees: { matricule: number; fonction: string; departement: string; nb: number; jours: number }[];
}

const n = (v: unknown): number => Number(v ?? 0);
const s = (v: unknown): string => (v === null || v === undefined || v === '' ? '(non renseigné)' : String(v));

export function buildStats(): Stats {
  const employees = n(one('SELECT COUNT(*) c FROM employees').c);
  const departed = n(one('SELECT COUNT(*) c FROM employees WHERE date_fin IS NOT NULL').c);
  const active = employees - departed;
  const avgAge = n(one('SELECT ROUND(AVG(age),1) a FROM employees WHERE age IS NOT NULL').a);

  const absenceRecords = n(one('SELECT COUNT(*) c FROM absences').c);
  const absenceDays = n(one('SELECT ROUND(SUM(nbr_jours),1) j FROM absences').j);
  const employeesWithAbsence = n(one('SELECT COUNT(DISTINCT matricule) c FROM absences').c);
  const absenteeismRate = employees ? Math.round((employeesWithAbsence / employees) * 1000) / 10 : 0;

  const byDepartment = all(
    'SELECT departement l, COUNT(*) v FROM employees GROUP BY departement ORDER BY v DESC'
  ).map((r) => ({ label: s(r.l), value: n(r.v) }));

  const byMotif = all(
    `SELECT motif l, COUNT(*) v, ROUND(SUM(nbr_jours),1) j
     FROM absences GROUP BY motif ORDER BY v DESC`
  ).map((r) => ({ label: s(r.l), value: n(r.v), extra: n(r.j) }));

  const byYear = all(
    `SELECT substr(date_debut,1,4) l, COUNT(*) v, ROUND(SUM(nbr_jours),1) j
     FROM absences WHERE date_debut IS NOT NULL AND date_debut <> ''
     GROUP BY l ORDER BY l`
  ).map((r) => ({ label: s(r.l), value: n(r.v), extra: n(r.j) }));

  const byGender = all(
    'SELECT sexe l, COUNT(*) v FROM employees GROUP BY sexe ORDER BY sexe'
  ).map((r) => ({ label: `Sexe ${s(r.l)}`, value: n(r.v) }));

  const byContract = all(
    'SELECT nature_contrat l, COUNT(*) v FROM employees GROUP BY nature_contrat ORDER BY v DESC'
  ).map((r) => ({ label: s(r.l), value: n(r.v) }));

  const byQualification = all(
    'SELECT qualification l, COUNT(*) v FROM employees GROUP BY qualification ORDER BY v DESC'
  ).map((r) => ({ label: s(r.l), value: n(r.v) }));

  const topAbsentees = all(
    `SELECT a.matricule m, e.fonction f, e.departement d, COUNT(*) nb, ROUND(SUM(a.nbr_jours),1) jours
     FROM absences a LEFT JOIN employees e ON e.matricule = a.matricule
     GROUP BY a.matricule ORDER BY jours DESC LIMIT 10`
  ).map((r) => ({
    matricule: n(r.m),
    fonction: s(r.f),
    departement: s(r.d),
    nb: n(r.nb),
    jours: n(r.jours),
  }));

  return {
    kpis: { employees, active, departed, avgAge, absenceRecords, absenceDays, employeesWithAbsence, absenteeismRate },
    byDepartment,
    byMotif,
    byYear,
    byGender,
    byContract,
    byQualification,
    topAbsentees,
  };
}
