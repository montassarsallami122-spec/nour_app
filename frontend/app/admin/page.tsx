'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AppNav } from '../components/AppNav';
import { useI18n } from '../lib/i18n';

interface Account {
  id: number;
  username: string;
  matricule: number;
  role: 'admin' | 'rh' | 'employee';
  email: string | null;
  phone: string | null;
  must_reset: number;
  created_at: string;
}

export default function AdminPage() {
  const { t } = useI18n();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Formulaire de création
  const [role, setRole] = useState<'employee' | 'rh'>('employee');
  const [username, setUsername] = useState('');
  const [matricule, setMatricule] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');

  const isRh = role === 'rh';

  const load = useCallback(async () => {
    setError('');
    try {
      const r = await fetch('/api/admin/accounts');
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t('common.loadError'));
      setAccounts(d.accounts || []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    setError('');
    setNotice('');
    setCreating(true);
    try {
      const payload = isRh
        ? { username, password, role: 'rh', email, phone }
        : { username, matricule: Number(matricule), password, role: 'employee' };
      const r = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t('common.loadError'));
      setNotice(isRh ? t('admin.created.rh', { u: username }) : t('admin.created.employee', { u: username, m: matricule }));
      setUsername('');
      setMatricule('');
      setEmail('');
      setPhone('');
      setPassword('');
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function resetPw(id: number, username: string) {
    const pw = window.prompt(t('admin.resetPrompt', { u: username }));
    if (!pw) return;
    setError('');
    setNotice('');
    try {
      const r = await fetch(`/api/admin/accounts/${id}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Échec');
      setNotice(t('admin.resetDone', { u: username }));
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function remove(id: number, username: string) {
    if (!window.confirm(t('admin.deleteConfirm', { u: username }))) return;
    setError('');
    setNotice('');
    try {
      const r = await fetch(`/api/admin/accounts/${id}`, { method: 'DELETE' });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Échec');
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const badgeLabel = (r: Account['role']) =>
    r === 'admin' ? t('admin.badge.admin') : r === 'rh' ? t('admin.badge.rh') : t('admin.badge.employee');

  return (
    <div className="dash">
      <motion.header
        className="dash-header"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div>
          <h1>{t('admin.title')}</h1>
          <p>{t('admin.sub')}</p>
        </div>
        <AppNav />
      </motion.header>

      {error && <div className="dash-error">⚠️ {error}</div>}
      {notice && <div className="admin-notice">✅ {notice}</div>}

      <section className="charts">
        <motion.div
          className="card span-3"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <h2>{t('admin.new')}</h2>

          {/* Sélecteur de type de compte */}
          <div className="role-switch">
            <button
              type="button"
              className={!isRh ? 'active' : ''}
              onClick={() => setRole('employee')}
            >
              👤 {t('admin.role.employee')}
            </button>
            <button
              type="button"
              className={isRh ? 'active' : ''}
              onClick={() => setRole('rh')}
            >
              🛡️ {t('admin.role.rh')}
            </button>
          </div>

          <form className="admin-form" onSubmit={create}>
            <label>
              <span>{t('admin.username')}</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t('admin.username.ph')} required />
            </label>

            {isRh ? (
              <>
                <label>
                  <span>{t('admin.email')}</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('admin.email.ph')} required />
                </label>
                <label>
                  <span>{t('admin.phone')}</span>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('admin.phone.ph')} />
                </label>
              </>
            ) : (
              <label>
                <span>{t('admin.matricule')}</span>
                <input
                  type="number"
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                  placeholder={t('admin.matricule.ph')}
                  required
                />
              </label>
            )}

            <label>
              <span>{t('admin.password')}</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('admin.password.ph')}
                minLength={6}
                required
              />
            </label>
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? t('admin.creating') : t('admin.create')}
            </button>
          </form>
          <p className="admin-hint">{isRh ? t('admin.hint.rh') : t('admin.hint.employee')}</p>
        </motion.div>

        <motion.div
          className="card span-3"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut', delay: 0.06 }}
        >
          <h2>{t('admin.existing', { n: accounts.length })}</h2>
          {loading ? (
            <div className="dash-loading">{t('common.loading')}</div>
          ) : (
            <div className="table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>{t('admin.th.user')}</th>
                    <th>{t('admin.th.matricule')}</th>
                    <th>{t('admin.th.role')}</th>
                    <th>{t('admin.th.contact')}</th>
                    <th>{t('admin.th.status')}</th>
                    <th>{t('admin.th.created')}</th>
                    <th>{t('admin.th.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.id}>
                      <td>{a.username}</td>
                      <td>{a.role === 'employee' ? a.matricule : '—'}</td>
                      <td>
                        <span className={`badge ${a.role}`}>{badgeLabel(a.role)}</span>
                      </td>
                      <td>{a.email ? <a href={`mailto:${a.email}`}>{a.email}</a> : '—'}</td>
                      <td>{a.must_reset ? t('admin.status.reset') : t('admin.status.active')}</td>
                      <td>{a.created_at?.slice(0, 10)}</td>
                      <td className="admin-actions">
                        <button className="btn-mini" onClick={() => resetPw(a.id, a.username)}>
                          {t('admin.reset')}
                        </button>
                        <button className="btn-mini danger" onClick={() => remove(a.id, a.username)}>
                          {t('admin.delete')}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {accounts.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ color: 'var(--muted)' }}>
                        {t('admin.none')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </section>
    </div>
  );
}
