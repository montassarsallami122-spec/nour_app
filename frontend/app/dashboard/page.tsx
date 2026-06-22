'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { KpiCard, BarChart, Donut, type Slice } from '../components/charts';
import { AppNav } from '../components/AppNav';
import { ChatWidget } from '../components/ChatWidget';
import { useI18n } from '../lib/i18n';

interface AdminStats {
  scope: 'admin';
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

interface EmployeeStats {
  scope: 'employee';
  employee: {
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
    kpis: { absenceRecords: number; absenceDays: number; absenceHours: number; daysThisYear: number };
    byMotif: Slice[];
    byYear: Slice[];
    absences: { dateDebut: string; dateFin: string; motif: string; jours: number; heures: number; obs: string }[];
  };
}

type StatsResponse = AdminStats | EmployeeStats;

const fmt = (n: number) => n.toLocaleString('fr-FR');

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
  const { t } = useI18n();
  const [data, setData] = useState<StatsResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/stats')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || t('common.loadError'));
        return d as StatsResponse;
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, [t]);

  const isEmployee = data?.scope === 'employee';

  return (
    <div className="dash">
      <motion.header
        className="dash-header"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div>
          <h1>{isEmployee ? t('dash.emp.title') : t('dash.admin.title')}</h1>
          <p>
            {isEmployee
              ? t('dash.emp.sub', { m: (data as EmployeeStats).employee.matricule })
              : t('dash.admin.sub')}
          </p>
        </div>
        <AppNav />
      </motion.header>

      {error && <div className="dash-error">⚠️ {error}</div>}
      {!data && !error && <div className="dash-loading">{t('common.loading')}</div>}

      {data?.scope === 'admin' && <AdminView stats={data} />}
      {data?.scope === 'employee' && <EmployeeView stats={data.employee} />}

      <ChatWidget />
    </div>
  );
}

function AdminView({ stats }: { stats: AdminStats }) {
  const { t } = useI18n();
  return (
    <>
      <section className="kpi-grid">
        <KpiCard label={t('dash.kpi.employees')} value={stats.kpis.employees} accent index={0} />
        <KpiCard label={t('dash.kpi.active')} value={stats.kpis.active} sub={t('dash.kpi.departed', { n: fmt(stats.kpis.departed) })} index={1} />
        <KpiCard label={t('dash.kpi.avgAge')} value={stats.kpis.avgAge} decimals={1} suffix=" ans" index={2} />
        <KpiCard label={t('dash.kpi.absDays')} value={stats.kpis.absenceDays} decimals={1} sub={t('dash.kpi.records', { n: fmt(stats.kpis.absenceRecords) })} index={3} />
        <KpiCard label={t('dash.kpi.absRate')} value={stats.kpis.absenteeismRate} decimals={1} suffix="%" sub={t('dash.kpi.concerned', { n: fmt(stats.kpis.employeesWithAbsence) })} index={4} />
      </section>

      <section className="charts">
        <Card className="span-2" i={0}>
          <h2>{t('dash.chart.byDept')}</h2>
          <BarChart data={stats.byDepartment} unit={t('dash.unit.emp')} />
        </Card>
        <Card i={1}>
          <h2>{t('dash.chart.byGender')}</h2>
          <Donut data={stats.byGender} />
        </Card>
        <Card i={2}>
          <h2>{t('dash.chart.byContract')}</h2>
          <Donut data={stats.byContract} />
        </Card>
        <Card className="span-2" i={3}>
          <h2>{t('dash.chart.byMotif')}</h2>
          <BarChart data={stats.byMotif} unit={t('dash.unit.abs')} />
        </Card>
        <Card className="span-2" i={4}>
          <h2>{t('dash.chart.byYear')}</h2>
          <BarChart data={stats.byYear} unit={t('dash.unit.abs')} />
        </Card>
        <Card i={5}>
          <h2>{t('dash.chart.byQual')}</h2>
          <Donut data={stats.byQualification} />
        </Card>
        <Card className="span-3" i={6}>
          <h2>{t('dash.chart.top10')}</h2>
          <div className="table-wrap">
            <table className="dash-table">
              <thead>
                <tr><th>{t('dash.th.matricule')}</th><th>{t('dash.th.fonction')}</th><th>{t('dash.th.dept')}</th><th>{t('dash.th.absences')}</th><th>{t('dash.th.days')}</th></tr>
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
  );
}

function EmployeeView({ stats }: { stats: EmployeeStats['employee'] }) {
  const { t } = useI18n();
  const p = stats.profile;
  const item = (k: string, v: React.ReactNode) => (
    <div className="profile-item">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  );

  return (
    <>
      <section className="kpi-grid">
        <KpiCard label={t('dash.kpi.absDaysTotal')} value={stats.kpis.absenceDays} decimals={1} accent index={0} />
        <KpiCard label={t('dash.kpi.thisYear')} value={stats.kpis.daysThisYear} decimals={1} suffix=" j" index={1} />
        <KpiCard label={t('dash.kpi.absHours')} value={stats.kpis.absenceHours} decimals={1} index={2} />
        <KpiCard label={t('dash.kpi.recordsLabel')} value={stats.kpis.absenceRecords} index={3} />
      </section>

      <section className="charts">
        <Card className="span-3" i={0}>
          <h2>{t('dash.emp.contract')}</h2>
          <div className="profile-grid">
            {item(t('dash.emp.fonction'), p.fonction)}
            {item(t('dash.emp.dept'), p.departement)}
            {item(t('dash.emp.qualification'), p.qualification)}
            {item(t('dash.emp.contractType'), p.natureContrat)}
            {item(t('dash.emp.company'), p.societe)}
            {item(t('dash.emp.costCenter'), p.centreDeCout)}
            {item(t('dash.emp.age'), p.age ?? '—')}
            {item(t('dash.emp.contractStart'), p.dateContrat ?? '—')}
            {item(t('dash.emp.status'), p.actif ? t('dash.emp.inPost') : t('dash.emp.leftOn', { d: p.dateFin ?? '—' }))}
          </div>
        </Card>

        {stats.byMotif.length > 0 && (
          <Card className="span-2" i={1}>
            <h2>{t('dash.emp.byMotif')}</h2>
            <BarChart data={stats.byMotif} unit={t('dash.unit.abs')} />
          </Card>
        )}
        {stats.byYear.length > 0 && (
          <Card className="span-2" i={2}>
            <h2>{t('dash.emp.byYear')}</h2>
            <BarChart data={stats.byYear} unit={t('dash.unit.abs')} />
          </Card>
        )}

        <Card className="span-3" i={3}>
          <h2>{t('dash.emp.detail', { n: stats.absences.length })}</h2>
          {stats.absences.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>{t('dash.emp.none')}</p>
          ) : (
            <div className="table-wrap">
              <table className="dash-table">
                <thead>
                  <tr><th>{t('dash.th.start')}</th><th>{t('dash.th.end')}</th><th>{t('dash.th.motif')}</th><th>{t('dash.th.days')}</th><th>{t('dash.th.hours')}</th><th>{t('dash.th.obs')}</th></tr>
                </thead>
                <tbody>
                  {stats.absences.map((a, i) => (
                    <tr key={i}>
                      <td>{a.dateDebut}</td>
                      <td>{a.dateFin}</td>
                      <td>{a.motif}</td>
                      <td><strong>{fmt(a.jours)}</strong></td>
                      <td>{fmt(a.heures)}</td>
                      <td>{a.obs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </>
  );
}
