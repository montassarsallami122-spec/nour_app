'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AppNav } from '../components/AppNav';
import { ForecastChart, type ForecastSeries } from '../components/charts';
import { useI18n } from '../lib/i18n';

interface Notifications {
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
  deptTurnover: { items: { departement: string; total: number; departed: number; rate: number }[] };
}

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  body: string;
  is_read: number;
  created_at: string;
}

interface Forecast {
  absenteeism: ForecastSeries;
  turnover: ForecastSeries;
}

function Card({ i = 0, className = 'span-3', children }: { i?: number; className?: string; children: React.ReactNode }) {
  return (
    <motion.div
      className={`card ${className}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut', delay: i * 0.06 }}
    >
      {children}
    </motion.div>
  );
}

function ForecastCard({
  i,
  title,
  sub,
  series,
  color,
}: {
  i: number;
  title: string;
  sub: string;
  series: ForecastSeries;
  color: string;
}) {
  const { t } = useI18n();
  const trendSym = series.trend === 'up' ? '↑' : series.trend === 'down' ? '↓' : '→';
  const sign = series.changePct > 0 ? '+' : '';
  return (
    <Card i={i} className="forecast-card">
      <div className="forecast-head">
        <h2>{title}</h2>
        <span className={`trend-pill ${series.trend}`}>
          {trendSym} {sign}
          {series.changePct}% · {t(`rh.forecast.trend.${series.trend}`)}
        </span>
      </div>
      <p className="rh-card-sub">{sub}</p>
      <div className="forecast-metric">
        <span className="fc-next">
          {series.nextValue.toLocaleString('fr-FR')}
          {series.unit}
        </span>
        <span className="fc-next-label">{t('rh.forecast.next')}</span>
      </div>
      <ForecastChart series={series} color={color} />
      <div className="forecast-legend">
        <span><i className="fc-key" style={{ borderColor: color }} /> {t('rh.forecast.legend.history')}</span>
        <span><i className="fc-key dashed" style={{ borderColor: color }} /> {t('rh.forecast.legend.forecast')}</span>
        <span><i className="fc-key band" style={{ background: color }} /> {t('rh.forecast.legend.band')}</span>
      </div>
      <p className="forecast-foot">{t('rh.forecast.method')}</p>
    </Card>
  );
}

export default function NotificationsPage() {
  const { t } = useI18n();
  const [notif, setNotif] = useState<Notifications | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState('');

  const loadMessages = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/messages');
      const d = await r.json();
      if (r.ok) {
        setMessages(d.messages || []);
        setUnread(d.unread || 0);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetch('/api/notifications')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || t('common.loadError'));
        return d as Notifications;
      })
      .then(setNotif)
      .catch((e) => setError(e.message));

    fetch('/api/forecast')
      .then(async (r) => {
        const d = await r.json();
        if (r.ok) return d as Forecast;
        throw new Error(d.error || t('common.loadError'));
      })
      .then(setForecast)
      .catch(() => {
        /* la prévision est optionnelle : on n'interrompt pas la page */
      });

    loadMessages();
  }, [loadMessages, t]);

  async function markRead(id: number) {
    await fetch(`/api/admin/messages/${id}/read`, { method: 'POST' });
    loadMessages();
  }
  async function removeMsg(id: number) {
    if (!window.confirm(t('rh.msg.deleteConfirm'))) return;
    await fetch(`/api/admin/messages/${id}`, { method: 'DELETE' });
    loadMessages();
  }

  return (
    <div className="dash">
      <motion.header
        className="dash-header"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div>
          <h1>{t('rh.title')}</h1>
          <p>{t('rh.sub')}</p>
        </div>
        <AppNav />
      </motion.header>

      {error && <div className="dash-error">⚠️ {error}</div>}
      {!notif && !error && <div className="dash-loading">{t('common.loading')}</div>}

      {forecast && (
        <>
          <motion.div
            className="forecast-section-head"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <h2>{t('rh.forecast.head')}</h2>
            <p>{t('rh.forecast.sub')}</p>
          </motion.div>
          <section className="charts forecast-grid">
            <ForecastCard
              i={0}
              title={t('rh.forecast.abs.title')}
              sub={t('rh.forecast.abs.sub')}
              series={forecast.absenteeism}
              color="#06b6d4"
            />
            <ForecastCard
              i={1}
              title={t('rh.forecast.turn.title')}
              sub={t('rh.forecast.turn.sub')}
              series={forecast.turnover}
              color="#8b5cf6"
            />
          </section>
        </>
      )}

      {notif && (
        <section className="charts">
          {/* Départs à la retraite */}
          <Card i={0}>
            <div className="rh-card-head">
              <h2>{t('rh.retire.title')}</h2>
              <span className="rh-count">{notif.retirement.count}</span>
            </div>
            <p className="rh-card-sub">{t('rh.retire.sub', { age: notif.retirement.threshold })}</p>
            {notif.retirement.items.length === 0 ? (
              <p className="rh-empty">{t('rh.retire.none')}</p>
            ) : (
              <div className="table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>{t('dash.th.matricule')}</th>
                      <th>{t('dash.th.fonction')}</th>
                      <th>{t('dash.th.dept')}</th>
                      <th>{t('rh.th.age')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {notif.retirement.items.map((r) => (
                      <tr key={r.matricule}>
                        <td>{r.matricule}</td>
                        <td>{r.fonction}</td>
                        <td>{r.departement}</td>
                        <td><strong>{r.age}</strong></td>
                        <td>
                          <span className={`alert-pill ${r.level}`}>
                            {r.level === 'urgent' ? t('rh.retire.urgent') : t('rh.retire.soon')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Risque de turnover individuel */}
          <Card i={1}>
            <div className="rh-card-head">
              <h2>{t('rh.flight.title')}</h2>
              <span className="rh-count warn">{notif.flightRisk.count}</span>
            </div>
            <p className="rh-card-sub">{t('rh.flight.sub', { d: notif.flightRisk.thresholdDays })}</p>
            {notif.flightRisk.items.length === 0 ? (
              <p className="rh-empty">{t('rh.flight.none')}</p>
            ) : (
              <div className="table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>{t('dash.th.matricule')}</th>
                      <th>{t('dash.th.fonction')}</th>
                      <th>{t('dash.th.dept')}</th>
                      <th>{t('rh.th.absDays')}</th>
                      <th>{t('rh.th.records')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notif.flightRisk.items.map((r) => (
                      <tr key={r.matricule}>
                        <td>{r.matricule}</td>
                        <td>{r.fonction}</td>
                        <td>{r.departement}</td>
                        <td><strong>{r.jours}</strong></td>
                        <td>{r.records}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Turnover par département */}
          <Card i={2}>
            <h2>{t('rh.dept.title')}</h2>
            <p className="rh-card-sub">{t('rh.dept.sub')}</p>
            {notif.deptTurnover.items.length === 0 ? (
              <p className="rh-empty">{t('rh.dept.none')}</p>
            ) : (
              <div className="table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>{t('rh.th.dept')}</th>
                      <th>{t('rh.th.total')}</th>
                      <th>{t('rh.th.departed')}</th>
                      <th>{t('rh.th.rate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notif.deptTurnover.items.map((r) => (
                      <tr key={r.departement}>
                        <td>{r.departement}</td>
                        <td>{r.total}</td>
                        <td>{r.departed}</td>
                        <td><strong>{r.rate}%</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Boîte de réception des messages de contact */}
          <Card i={3}>
            <div className="rh-card-head">
              <h2>{t('rh.msg.title')}</h2>
              {unread > 0 && <span className="rh-count warn">{unread}</span>}
            </div>
            <p className="rh-card-sub">{t('rh.msg.sub', { n: messages.length, u: unread })}</p>
            {messages.length === 0 ? (
              <p className="rh-empty">{t('rh.msg.none')}</p>
            ) : (
              <div className="msg-list">
                {messages.map((m) => (
                  <div key={m.id} className={`msg-item ${m.is_read ? '' : 'unread'}`}>
                    <div className="msg-item-head">
                      <div>
                        <strong>{m.subject || '—'}</strong>
                        <span className="msg-from">
                          {t('rh.msg.from')} {m.name} · <a href={`mailto:${m.email}`}>{m.email}</a>
                        </span>
                      </div>
                      <span className="msg-date">{m.created_at?.slice(0, 16).replace('T', ' ')}</span>
                    </div>
                    <p className="msg-body">{m.body}</p>
                    <div className="msg-actions">
                      {!m.is_read && (
                        <button className="btn-mini" onClick={() => markRead(m.id)}>{t('rh.msg.markRead')}</button>
                      )}
                      <button className="btn-mini danger" onClick={() => removeMsg(m.id)}>{t('rh.msg.delete')}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      )}
    </div>
  );
}
