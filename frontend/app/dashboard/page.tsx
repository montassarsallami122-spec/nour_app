'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { KpiCard, BarChart, Donut, type Slice } from '../components/charts';
import { AppNav } from '../components/AppNav';
import { ChatWidget } from '../components/ChatWidget';

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

// Carte de graphique : révélation au scroll + léger soulèvement au survol.
function Card({ className = '', i = 0, children }: { className?: string; i?: number; children: React.ReactNode }) {
  return (
    <motion.div
      className={`card ${className}`}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.45, ease: 'easeOut', delay: i * 0.06 }}
      whileHover={{ y: -4 }}
    >
      {children}
    </motion.div>
  );
}

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
      <motion.header
        className="dash-header"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div>
          <h1>Tableau de bord RH</h1>
          <p>Vue d&apos;ensemble des employés &amp; absences</p>
        </div>
        <AppNav />
      </motion.header>

      {error && <div className="dash-error">⚠️ {error}</div>}
      {!stats && !error && <div className="dash-loading">Chargement des données…</div>}

      {stats && (
        <>
          <section className="kpi-grid">
            <KpiCard label="Employés" value={stats.kpis.employees} accent index={0} />
            <KpiCard label="En poste" value={stats.kpis.active} sub={`${fmt(stats.kpis.departed)} sortis`} index={1} />
            <KpiCard label="Âge moyen" value={stats.kpis.avgAge} decimals={1} suffix=" ans" index={2} />
            <KpiCard label="Jours d'absence" value={stats.kpis.absenceDays} decimals={1} sub={`${fmt(stats.kpis.absenceRecords)} enregistrements`} index={3} />
            <KpiCard label="Taux d'absentéisme" value={stats.kpis.absenteeismRate} decimals={1} suffix="%" sub={`${fmt(stats.kpis.employeesWithAbsence)} employés concernés`} index={4} />
          </section>

          <section className="charts">
            <Card className="span-2" i={0}>
              <h2>Effectif par département</h2>
              <BarChart data={stats.byDepartment} unit="emp." />
            </Card>

            <Card i={1}>
              <h2>Répartition par sexe</h2>
              <Donut data={stats.byGender} />
            </Card>

            <Card i={2}>
              <h2>Par type de contrat</h2>
              <Donut data={stats.byContract} />
            </Card>

            <Card className="span-2" i={3}>
              <h2>Absences par motif</h2>
              <BarChart data={stats.byMotif} unit="abs." />
            </Card>

            <Card className="span-2" i={4}>
              <h2>Absences par année</h2>
              <BarChart data={stats.byYear} unit="abs." />
            </Card>

            <Card i={5}>
              <h2>Par qualification</h2>
              <Donut data={stats.byQualification} />
            </Card>

            <Card className="span-3" i={6}>
              <h2>Top 10 des plus absents</h2>
              <div className="table-wrap">
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
            </Card>
          </section>
        </>
      )}

      <ChatWidget />
    </div>
  );
}
