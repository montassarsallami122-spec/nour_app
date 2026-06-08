'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { KpiCard, BarChart, Donut, type Slice } from '../components/charts';

interface Stats {
  kpis: {
    employees: number;
    active: number;
    departed: number;
    avgAge: number;
    absenceRecords: number;
    absenceDays: number;
    employeesWithAbsence: number;
    absenteeismRate: number;
  };
  byDepartment: Slice[];
  byMotif: Slice[];
  byYear: Slice[];
  byGender: Slice[];
  byContract: Slice[];
  byQualification: Slice[];
  topAbsentees: { matricule: number; fonction: string; departement: string; nb: number; jours: number }[];
}

const fmt = (n: number) => n.toLocaleString('fr-FR');

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/stats')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Erreur de chargement');
        return data as Stats;
      })
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="dash">
      <header className="dash-header">
        <div>
          <h1>Tableau de bord RH</h1>
          <p>Vue d&apos;ensemble des employés &amp; absences</p>
        </div>
        <nav className="nav">
          <Link href="/" className="nav-link">💬 Chatbot</Link>
          <span className="nav-link active">📊 Dashboard</span>
        </nav>
      </header>

      {error && <div className="dash-error">⚠️ {error}</div>}
      {!stats && !error && <div className="dash-loading">Chargement des données…</div>}

      {stats && (
        <>
          <section className="kpi-grid">
            <KpiCard label="Employés" value={fmt(stats.kpis.employees)} accent />
            <KpiCard label="En poste" value={fmt(stats.kpis.active)} sub={`${fmt(stats.kpis.departed)} sortis`} />
            <KpiCard label="Âge moyen" value={`${stats.kpis.avgAge} ans`} />
            <KpiCard label="Jours d'absence" value={fmt(stats.kpis.absenceDays)} sub={`${fmt(stats.kpis.absenceRecords)} enregistrements`} />
            <KpiCard label="Taux d'absentéisme" value={`${stats.kpis.absenteeismRate}%`} sub={`${fmt(stats.kpis.employeesWithAbsence)} employés concernés`} />
          </section>

          <section className="charts">
            <div className="card span-2">
              <h2>Effectif par département</h2>
              <BarChart data={stats.byDepartment} unit="emp." />
            </div>

            <div className="card">
              <h2>Répartition par sexe</h2>
              <Donut data={stats.byGender} />
            </div>

            <div className="card">
              <h2>Par type de contrat</h2>
              <Donut data={stats.byContract} />
            </div>

            <div className="card span-2">
              <h2>Absences par motif</h2>
              <BarChart data={stats.byMotif} unit="abs." />
            </div>

            <div className="card span-2">
              <h2>Absences par année</h2>
              <BarChart data={stats.byYear} unit="abs." />
            </div>

            <div className="card">
              <h2>Par qualification</h2>
              <Donut data={stats.byQualification} />
            </div>

            <div className="card span-3">
              <h2>Top 10 des plus absents</h2>
              <table className="dash-table">
                <thead>
                  <tr><th>Matricule</th><th>Fonction</th><th>Dépt.</th><th>Absences</th><th>Jours</th></tr>
                </thead>
                <tbody>
                  {stats.topAbsentees.map((t) => (
                    <tr key={t.matricule}>
                      <td>{t.matricule}</td>
                      <td>{t.fonction}</td>
                      <td>{t.departement}</td>
                      <td>{fmt(t.nb)}</td>
                      <td><strong>{fmt(t.jours)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
