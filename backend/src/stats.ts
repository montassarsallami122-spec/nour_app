// Agrégations pour le tableau de bord RH.
// Même principe que directChat.ts : tous les calculs sont faits par SQLite
// (chiffres exacts), on renvoie un JSON prêt à dessiner côté frontend.
import { db } from './db.js';

type Row = Record<string, unknown>;
const all = (sql: string, ...p: (string | number | null)[]): Row[] => db.prepare(sql).all(...p) as Row[];
const one = (sql: string, ...p: (string | number | null)[]): Row => db.prepare(sql).get(...p) as Row;

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

// --- Vue personnelle d'un employé (tableau de bord scoped) ---------------------
export interface EmployeeStats {
  matricule: number;
  profile: {
    departement: string;
    fonction: string;
    qualification: string;
    natureContrat: string;
    societe: string;
    centreDeCout: string;
    age: number | null;
    dateContrat: string | null;
    dateFin: string | null;
    actif: boolean;
  };
  kpis: {
    absenceRecords: number;
    absenceDays: number;
    absenceHours: number;
    daysThisYear: number;
  };
  byMotif: Slice[];
  byYear: Slice[];
  absences: { dateDebut: string; dateFin: string; motif: string; jours: number; heures: number; obs: string }[];
}

export function buildEmployeeStats(matricule: number): EmployeeStats {
  const emp = one('SELECT * FROM employees WHERE matricule = ?', matricule);
  if (!emp || emp.matricule === undefined) {
    throw new Error(`Aucun employé pour le matricule ${matricule}.`);
  }

  const absenceRecords = n(one('SELECT COUNT(*) c FROM absences WHERE matricule = ?', matricule).c);
  const tot = one('SELECT ROUND(SUM(nbr_jours),1) j, ROUND(SUM(nbr_heures),1) h FROM absences WHERE matricule = ?', matricule);
  const thisYear = new Date().getUTCFullYear().toString();
  const yearDays = n(
    one(`SELECT ROUND(SUM(nbr_jours),1) j FROM absences WHERE matricule = ? AND substr(date_debut,1,4) = ?`, matricule, thisYear).j
  );

  const byMotif = all(
    `SELECT motif l, COUNT(*) v, ROUND(SUM(nbr_jours),1) j FROM absences WHERE matricule = ? GROUP BY motif ORDER BY v DESC`,
    matricule
  ).map((r) => ({ label: s(r.l), value: n(r.v), extra: n(r.j) }));

  const byYear = all(
    `SELECT substr(date_debut,1,4) l, COUNT(*) v, ROUND(SUM(nbr_jours),1) j
     FROM absences WHERE matricule = ? AND date_debut IS NOT NULL AND date_debut <> ''
     GROUP BY l ORDER BY l`,
    matricule
  ).map((r) => ({ label: s(r.l), value: n(r.v), extra: n(r.j) }));

  const absences = all(
    `SELECT date_debut, date_fin, motif, nbr_jours, nbr_heures, obs
     FROM absences WHERE matricule = ? ORDER BY date_debut DESC`,
    matricule
  ).map((r) => ({
    dateDebut: s(r.date_debut),
    dateFin: s(r.date_fin),
    motif: s(r.motif),
    jours: n(r.nbr_jours),
    heures: n(r.nbr_heures),
    obs: s(r.obs),
  }));

  return {
    matricule,
    profile: {
      departement: s(emp.departement),
      fonction: s(emp.fonction),
      qualification: s(emp.qualification),
      natureContrat: s(emp.nature_contrat),
      societe: s(emp.societe),
      centreDeCout: s(emp.centre_de_cout),
      age: emp.age === null || emp.age === undefined ? null : n(emp.age),
      dateContrat: (emp.date_contrat as string) ?? null,
      dateFin: (emp.date_fin as string) ?? null,
      actif: emp.date_fin === null || emp.date_fin === undefined,
    },
    kpis: {
      absenceRecords,
      absenceDays: n(tot.j),
      absenceHours: n(tot.h),
      daysThisYear: yearDays,
    },
    byMotif,
    byYear,
    absences,
  };
}

// --- Alertes RH : départs à la retraite & risques de turnover -----------------
// Seuil d'âge à partir duquel un départ à la retraite est « proche ». Réglable
// via la variable d'environnement RETIREMENT_AGE (défaut 60).
const RETIREMENT_AGE = Number(process.env.RETIREMENT_AGE || 60);
// Seuil de jours d'absence cumulés au-delà duquel un employé en poste est
// signalé comme « risque de turnover » (flight risk).
const FLIGHT_RISK_DAYS = Number(process.env.FLIGHT_RISK_DAYS || 15);

export interface Notifications {
  generatedAt: string;
  retirement: {
    threshold: number;
    count: number;
    items: { matricule: number; fonction: string; departement: string; age: number; level: 'urgent' | 'soon' }[];
  };
  flightRisk: {
    thresholdDays: number;
    count: number;
    items: { matricule: number; fonction: string; departement: string; jours: number; records: number }[];
  };
  deptTurnover: {
    items: { departement: string; total: number; departed: number; rate: number }[];
  };
}

export function buildNotifications(): Notifications {
  // 1) Départs à la retraite : employés EN POSTE proches de l'âge de départ.
  const retItems = all(
    `SELECT matricule m, fonction f, departement d, age a
     FROM employees
     WHERE (date_fin IS NULL OR date_fin = '') AND age IS NOT NULL AND age >= ? AND age <= 75
     ORDER BY age DESC, matricule`,
    RETIREMENT_AGE
  ).map((r) => {
    const age = n(r.a);
    return {
      matricule: n(r.m),
      fonction: s(r.f),
      departement: s(r.d),
      age,
      level: (age >= RETIREMENT_AGE + 3 ? 'urgent' : 'soon') as 'urgent' | 'soon',
    };
  });

  // 2) Risque de turnover (individuel) : employés en poste au fort absentéisme.
  const friskItems = all(
    `SELECT a.matricule m, e.fonction f, e.departement d, COUNT(*) nb, ROUND(SUM(a.nbr_jours),1) jours
     FROM absences a JOIN employees e ON e.matricule = a.matricule
     WHERE (e.date_fin IS NULL OR e.date_fin = '')
     GROUP BY a.matricule
     HAVING jours >= ?
     ORDER BY jours DESC
     LIMIT 20`,
    FLIGHT_RISK_DAYS
  ).map((r) => ({
    matricule: n(r.m),
    fonction: s(r.f),
    departement: s(r.d),
    jours: n(r.jours),
    records: n(r.nb),
  }));

  // 3) Turnover par département : part des employés ayant quitté l'entreprise.
  const deptItems = all(
    `SELECT departement d,
            COUNT(*) total,
            SUM(CASE WHEN date_fin IS NOT NULL AND date_fin <> '' THEN 1 ELSE 0 END) departed
     FROM employees
     GROUP BY departement
     HAVING total >= 5`
  )
    .map((r) => {
      const total = n(r.total);
      const departed = n(r.departed);
      return { departement: s(r.d), total, departed, rate: total ? Math.round((departed / total) * 1000) / 10 : 0 };
    })
    .filter((x) => x.rate >= 15)
    .sort((a, b) => b.rate - a.rate);

  return {
    generatedAt: new Date().toISOString(),
    retirement: { threshold: RETIREMENT_AGE, count: retItems.length, items: retItems },
    flightRisk: { thresholdDays: FLIGHT_RISK_DAYS, count: friskItems.length, items: friskItems },
    deptTurnover: { items: deptItems },
  };
}

// --- Prévisions RH : absentéisme & turnover -----------------------------------
// Projection par régression linéaire (moindres carrés) sur les séries
// historiques, avec un intervalle de confiance dérivé de l'écart-type des
// résidus. Tous les calculs restent locaux et transparents (aucun service
// externe) : on expose la méthode pour que l'utilisateur garde la main.
const WORKDAYS_PER_MONTH = 21.75; // jours ouvrés moyens / mois (pour le taux)

export interface ForecastPoint {
  period: string; // 'YYYY-MM' (absentéisme) ou 'YYYY' (turnover)
  value: number; // valeur historique ou prévue
  forecast: boolean; // true = point projeté
  lower?: number; // borne basse de l'intervalle (points prévus)
  upper?: number; // borne haute de l'intervalle (points prévus)
}

export interface ForecastSeries {
  unit: string; // libellé d'unité (ex: '%')
  points: ForecastPoint[]; // historique + prévision, dans l'ordre chronologique
  lastActual: number; // dernière valeur observée
  nextValue: number; // première valeur prévue
  changePct: number; // évolution prévue vs moyenne récente (%)
  trend: 'up' | 'down' | 'flat';
  horizon: number; // nombre de périodes projetées
}

export interface Forecast {
  generatedAt: string;
  absenteeism: ForecastSeries; // taux d'absentéisme mensuel (%)
  turnover: ForecastSeries; // taux de turnover annuel (%)
}

// Régression linéaire simple sur une série y (x = 0,1,2,…).
function linreg(ys: number[]) {
  const len = ys.length;
  const mx = (len - 1) / 2;
  const my = ys.reduce((a, b) => a + b, 0) / len;
  let num = 0;
  let den = 0;
  for (let i = 0; i < len; i++) {
    num += (i - mx) * (ys[i] - my);
    den += (i - mx) * (i - mx);
  }
  const slope = den ? num / den : 0;
  const intercept = my - slope * mx;
  let ss = 0;
  for (let i = 0; i < len; i++) {
    const pred = intercept + slope * i;
    ss += (ys[i] - pred) * (ys[i] - pred);
  }
  const resid = Math.sqrt(ss / Math.max(1, len - 2)); // écart-type résiduel
  return { slope, intercept, resid };
}

const round1 = (v: number) => Math.round(v * 10) / 10;

// Construit une série prévisionnelle à partir de l'historique (périodes + valeurs).
function buildSeries(
  periods: string[],
  values: number[],
  futurePeriods: string[],
  unit: string
): ForecastSeries {
  const { slope, intercept, resid } = linreg(values);
  const band = 1.64 * resid; // intervalle ~90 %
  const n = values.length;

  const points: ForecastPoint[] = periods.map((p, i) => ({
    period: p,
    value: round1(values[i]),
    forecast: false,
  }));

  futurePeriods.forEach((p, k) => {
    const pred = Math.max(0, intercept + slope * (n + k));
    points.push({
      period: p,
      value: round1(pred),
      forecast: true,
      lower: round1(Math.max(0, pred - band)),
      upper: round1(pred + band),
    });
  });

  const lastActual = round1(values[n - 1]);
  const nextValue = points[n]?.value ?? lastActual;
  // Moyenne récente (jusqu'à 6 dernières observations) vs moyenne projetée.
  const recent = values.slice(-Math.min(6, n));
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const projAvg =
    futurePeriods.reduce((a, _p, k) => a + Math.max(0, intercept + slope * (n + k)), 0) /
    Math.max(1, futurePeriods.length);
  const changePct = recentAvg ? round1(((projAvg - recentAvg) / recentAvg) * 100) : 0;
  const trend: 'up' | 'down' | 'flat' = changePct > 2 ? 'up' : changePct < -2 ? 'down' : 'flat';

  return { unit, points, lastActual, nextValue, changePct, trend, horizon: futurePeriods.length };
}

// Génère une liste de mois 'YYYY-MM' à partir d'un mois de départ (inclus).
function addMonths(start: string, count: number, skipFirst = false): string[] {
  let [y, m] = start.split('-').map(Number);
  const out: string[] = [];
  const total = count + (skipFirst ? 1 : 0);
  for (let i = 0; i < total; i++) {
    if (!(skipFirst && i === 0)) out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

function monthRange(start: string, end: string): string[] {
  const out: string[] = [];
  let [y, m] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

// Effectif actif employés présents pendant une période [start, end] (dates ISO).
function activeHeadcount(start: string, end: string): number {
  return n(
    one(
      `SELECT COUNT(*) c FROM employees
       WHERE (date_contrat IS NULL OR date_contrat = '' OR date_contrat <= ?)
         AND (date_fin IS NULL OR date_fin = '' OR date_fin >= ?)`,
      end,
      start
    ).c
  );
}

export function buildForecast(): Forecast {
  // --- 1) Taux d'absentéisme mensuel (%) ---------------------------------------
  // On part de janvier 2024 (premier mois où les données sont continues).
  const monthRows = all(
    `SELECT substr(date_debut,1,7) m, ROUND(SUM(nbr_jours),1) j
     FROM absences
     WHERE date_debut >= '2024-01-01' AND date_debut <> ''
     GROUP BY m ORDER BY m`
  );
  const dayByMonth = new Map(monthRows.map((r) => [s(r.m), n(r.j)]));
  const firstMonth = s(monthRows[0]?.m) || '2024-01';
  const lastMonth = s(monthRows[monthRows.length - 1]?.m) || firstMonth;
  const months = monthRange(firstMonth, lastMonth);

  const absRates = months.map((m) => {
    const head = activeHeadcount(`${m}-01`, `${m}-31`);
    const days = dayByMonth.get(m) ?? 0;
    const denom = head * WORKDAYS_PER_MONTH;
    return denom ? (days / denom) * 100 : 0;
  });
  const absFuture = addMonths(lastMonth, 6, true); // 6 mois suivants
  const absenteeism = buildSeries(months, absRates, absFuture, '%');

  // --- 2) Taux de turnover annuel (%) ------------------------------------------
  // Années complètes : on s'arrête à l'avant-dernière année présente pour éviter
  // une année partielle (snapshot) qui fausserait la tendance.
  const maxYear = n(one(`SELECT MAX(substr(date_fin,1,4)) y FROM employees WHERE date_fin <> ''`).y);
  const endYear = maxYear - 1;
  const startYear = Math.max(2019, endYear - 6);
  const years: string[] = [];
  const turnoverRates: number[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const departed = n(
      one(`SELECT COUNT(*) c FROM employees WHERE date_fin >= ? AND date_fin <= ?`, `${y}-01-01`, `${y}-12-31`).c
    );
    const head = activeHeadcount(`${y}-01-01`, `${y}-12-31`);
    years.push(String(y));
    turnoverRates.push(head ? (departed / head) * 100 : 0);
  }
  const turnFuture = [String(endYear + 1), String(endYear + 2)]; // 2 années projetées
  const turnover = buildSeries(years, turnoverRates, turnFuture, '%');

  return { generatedAt: new Date().toISOString(), absenteeism, turnover };
}

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
