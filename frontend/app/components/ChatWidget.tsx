'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../lib/i18n';

interface Message {
  role: 'user' | 'bot';
  content: string;
  sql?: string;
}

// Widget de chat flottant : une bulle en bas à droite qui ouvre un panneau
// de discussion. Réutilise l'endpoint /api/chat (clé d'API côté serveur).
export function ChatWidget() {
  const { t } = useI18n();
  const SUGGESTIONS = [t('chat.s.admin.1'), t('chat.s.admin.2'), t('chat.s.admin.4'), t('chat.s.admin.5')];
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: t('chat.greeting') },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, open]);

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
    <div className="cw">
      <AnimatePresence>
        {open && (
          <motion.div
            className="cw-panel"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <header className="cw-head">
              <div className="cw-head-info">
                <span className="cw-avatar">💬</span>
                <div>
                  <strong>Assistant RH</strong>
                  <small>{t('chat.sub.staff')}</small>
                </div>
              </div>
              <button className="cw-close" onClick={() => setOpen(false)} aria-label="Fermer">✕</button>
            </header>

            <div className="cw-body" ref={bodyRef}>
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  className={`msg ${m.role}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="bubble">
                    {m.role === 'bot' ? (
                      <div className="md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div>
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
                  <div className="bubble"><span className="typing"><span /><span /><span /></span></div>
                </div>
              )}
            </div>

            {messages.length <= 1 && (
              <div className="cw-suggest">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            )}

            <form className="cw-composer" onSubmit={(e) => { e.preventDefault(); send(input); }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('chat.placeholder')}
                disabled={loading}
              />
              <button type="submit" disabled={loading || !input.trim()} aria-label="Envoyer">➤</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        className="cw-bubble"
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        aria-label={open ? 'Fermer le chat' : 'Ouvrir le chat'}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? 'close' : 'open'}
            initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
            transition={{ duration: 0.18 }}
          >
            {open ? '✕' : '💬'}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
