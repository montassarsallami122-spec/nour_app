'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useI18n, LangToggle } from '../lib/i18n';

interface RhContact {
  username: string;
  email: string;
  phone: string | null;
}

export default function ContactPage() {
  const { t } = useI18n();
  const [contacts, setContacts] = useState<RhContact[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/contacts')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setContacts(d.contacts || []))
      .catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setError('');
    setSending(true);
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, body }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t('common.loadError'));
      setSent(true);
      setName('');
      setEmail('');
      setSubject('');
      setBody('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="contact-page">
      <div className="auth-glow" />

      <motion.header
        className="land-nav"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="land-nav-inner">
          <Link href="/" className="land-logo">
            <span className="land-logo-mark">📊</span>
            <span>Chatbot RH</span>
          </Link>
          <nav className="land-nav-links">
            <Link href="/">{t('contact.back')}</Link>
            <LangToggle />
            <Link href="/login" className="land-cta-sm">{t('land.nav.login')}</Link>
          </nav>
        </div>
      </motion.header>

      <section className="contact-wrap">
        <motion.div
          className="contact-head"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <h1>{t('contact.title')}</h1>
          <p>{t('contact.sub')}</p>
        </motion.div>

        <div className="contact-grid">
          {/* Formulaire */}
          <motion.div
            className="contact-card"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }}
          >
            <h2>{t('contact.form.title')}</h2>
            {sent ? (
              <motion.div
                className="contact-sent"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                {t('contact.form.sent')}
              </motion.div>
            ) : (
              <form className="contact-form" onSubmit={submit}>
                <label>
                  <span>{t('contact.form.name')}</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} required />
                </label>
                <label>
                  <span>{t('contact.form.email')}</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
                <label>
                  <span>{t('contact.form.subject')}</span>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)} />
                </label>
                <label>
                  <span>{t('contact.form.message')}</span>
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} required />
                </label>
                {error && <div className="auth-error">⚠️ {error}</div>}
                <button type="submit" className="btn-primary" disabled={sending || !name || !email || !body}>
                  {sending ? t('contact.form.sending') : t('contact.form.send')}
                </button>
              </form>
            )}
          </motion.div>

          {/* Coordonnées RH */}
          <motion.div
            className="contact-card"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.12 }}
          >
            <h2>{t('contact.panel.title')}</h2>
            {contacts.length === 0 ? (
              <p className="rh-empty">{t('contact.panel.empty')}</p>
            ) : (
              <ul className="contact-list">
                {contacts.map((c) => (
                  <li key={c.username} className="contact-item">
                    <span className="contact-avatar">👤</span>
                    <div>
                      <strong>{c.username}</strong>
                      <div className="contact-line">
                        <span className="contact-k">{t('contact.panel.email')}</span>
                        <a href={`mailto:${c.email}`}>{c.email}</a>
                      </div>
                      {c.phone && (
                        <div className="contact-line">
                          <span className="contact-k">{t('contact.panel.phone')}</span>
                          <a href={`tel:${c.phone}`}>{c.phone}</a>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </div>
      </section>
    </main>
  );
}
