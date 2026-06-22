'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { AppNav } from '../components/AppNav';
import { useI18n } from '../lib/i18n';

interface Message {
  role: 'user' | 'bot';
  content: string;
  sql?: string;
}

export default function Chatbot() {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: t('chat.greeting') },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setRole(d.role))
      .catch(() => {});
  }, []);

  // L'employé voit les suggestions personnelles ; admin & rh les suggestions globales.
  const suggestions =
    role === 'employee'
      ? [t('chat.s.emp.1'), t('chat.s.emp.2'), t('chat.s.emp.3'), t('chat.s.emp.4'), t('chat.s.emp.5')]
      : [t('chat.s.admin.1'), t('chat.s.admin.2'), t('chat.s.admin.3'), t('chat.s.admin.4'), t('chat.s.admin.5')];

  async function send(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { role: 'bot', content: `⚠️ ${data.error || t('chat.error')}` }]);
      } else {
        setMessages((m) => [...m, { role: 'bot', content: data.answer, sql: data.sql }]);
      }
    } catch (e) {
      setMessages((m) => [...m, { role: 'bot', content: `⚠️ ${(e as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-row">
          <div>
            <h1>{t('chat.title')}</h1>
            <p>{role === 'employee' ? t('chat.sub.emp') : t('chat.sub.staff')}</p>
          </div>
          <AppNav />
        </div>
      </header>

      <div className="chat" ref={chatRef}>
        {messages.map((m, i) => (
          <motion.div
            key={i}
            className={`msg ${m.role}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="bubble">
              {m.role === 'bot' ? (
                <div className="md">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
              {m.sql && (
                <details className="sql">
                  <summary>{t('chat.sql')}</summary>
                  {m.sql}
                </details>
              )}
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="msg bot">
            <div className="bubble">
              <span className="typing"><span /><span /><span /></span>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {messages.length <= 1 && (
          <motion.div
            className="suggest"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ staggerChildren: 0.08 }}
          >
            {suggestions.map((s, i) => (
              <motion.button
                key={s}
                className="chip"
                onClick={() => send(s)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
              >
                {s}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <form
        className="composer"
        onSubmit={(e) => { e.preventDefault(); send(input); }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('chat.placeholder')}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>{t('chat.send')}</button>
      </form>
    </div>
  );
}
