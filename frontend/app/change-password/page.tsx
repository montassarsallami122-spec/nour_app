'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useI18n, LangToggle } from '../lib/i18n';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (pw1.length < 6) return setError(t('admin.password.ph'));
    if (pw1 !== pw2) return setError(t('cp.mismatch'));
    setLoading(true);
    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: pw1 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('login.fail'));
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-glow" />
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="auth-brand">
          <span className="auth-logo">🔐</span>
          <h1>{t('cp.title')}</h1>
          <p>{t('cp.sub')}</p>
          <LangToggle className="auth-lang" />
        </div>

        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>{t('cp.new')}</span>
            <input
              type="password"
              autoComplete="new-password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>
          <label>
            <span>{t('cp.confirm')}</span>
            <input
              type="password"
              autoComplete="new-password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {error && (
            <motion.div
              className="auth-error"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
              transition={{ duration: 0.4 }}
            >
              ⚠️ {error}
            </motion.div>
          )}

          <button type="submit" className="auth-submit" disabled={loading || !pw1 || !pw2}>
            {loading ? <span className="spinner" /> : t('cp.submit')}
          </button>
        </form>
      </motion.div>
    </main>
  );
}
