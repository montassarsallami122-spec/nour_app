'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { AppNav } from '../components/AppNav';

interface Message {
  role: 'user' | 'bot';
  content: string;
  sql?: string;
}

const SUGGESTIONS = [
  "Combien d'employés au total ?",
  "Top 5 des employés les plus absents",
  "Répartition des absences par motif",
  "Nombre de femmes vs hommes",
  "Combien de CDI dans le département AQ ?",
];

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', content: "Bonjour 👋 Posez-moi une question sur vos employés et leurs absences." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

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
        setMessages((m) => [...m, { role: 'bot', content: `⚠️ ${data.error || 'Erreur'}` }]);
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
            <h1>Chatbot RH — Mes données</h1>
            <p>Employés &amp; absences · propulsé par GPT-4o</p>
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
                  <summary>Voir la requête SQL</summary>
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
            {SUGGESTIONS.map((s, i) => (
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
          placeholder="Posez votre question…"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>Envoyer</button>
      </form>
    </div>
  );
}
