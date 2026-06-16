'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
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
        setError(data.error || 'Échec de la connexion.');
        return;
      }
      router.replace(from);
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
        <h1>Chatbot RH</h1>
        <p>Connectez-vous pour accéder à votre tableau de bord et à l&apos;assistant.</p>
      </div>

      <form className="auth-form" onSubmit={submit}>
        <label>
          <span>Identifiant</span>
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
          <span>Mot de passe</span>
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
          {loading ? <span className="spinner" /> : 'Se connecter'}
        </button>
      </form>

      <Link href="/" className="auth-back">← Retour à l&apos;accueil</Link>
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
