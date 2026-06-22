'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useI18n, LangToggle } from '../lib/i18n';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useI18n();
  const from = params.get('from') || '/dashboard';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('login.fail'));
        return;
      }
      // Première connexion : changement de mot de passe obligatoire.
      router.replace(data.mustReset ? '/change-password' : from);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="auth-card"
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="auth-brand">
        <span className="auth-logo">📊</span>
        <h1>{t('login.title')}</h1>
        <p>{t('login.sub')}</p>
        <LangToggle className="auth-lang" />
      </div>

      <form className="auth-form" onSubmit={submit}>
        <label>
          <span>{t('login.username')}</span>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="admin"
            required
          />
        </label>

        <label>
          <span>{t('login.password')}</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

        <button type="submit" className="auth-submit" disabled={loading || !username || !password}>
          {loading ? <span className="spinner" /> : t('login.submit')}
        </button>
      </form>

      <Link href="/" className="auth-back">{t('login.back')}</Link>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-glow" />
      <Suspense fallback={<div className="auth-card" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
