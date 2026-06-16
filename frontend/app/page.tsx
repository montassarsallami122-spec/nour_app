'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, animate } from 'framer-motion';

/* ---------- Compteur animé ---------- */
function Counter({ to, suffix = '', decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.4,
      ease: 'easeOut',
      onUpdate: (v) => setVal(v),
    });
    return () => controls.stop();
  }, [inView, to]);

  const formatted = val.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return <span ref={ref}>{formatted}{suffix}</span>;
}

/* ---------- Variantes de révélation ---------- */
const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut', delay: i * 0.1 },
  }),
};

const STATS = [
  { to: 2930, label: 'Employés suivis' },
  { to: 57425, label: 'Absences enregistrées' },
  { to: 37.9, suffix: ' ans', decimals: 1, label: "Âge moyen de l'effectif" },
  { to: 100, suffix: '%', label: 'Données restant locales' },
];

const FEATURES = [
  {
    icon: '💬',
    title: 'Assistant en langage naturel',
    desc: "Posez vos questions RH comme à un collègue. GPT-4o comprend, interroge vos données et répond avec des tableaux clairs.",
  },
  {
    icon: '📊',
    title: 'Tableau de bord temps réel',
    desc: "Effectifs, contrats, absentéisme, pyramide des âges — toutes vos métriques clés visualisées en un coup d'œil.",
  },
  {
    icon: '🔐',
    title: 'Sécurisé & confidentiel',
    desc: "Vos données restent sur votre infrastructure. Accès protégé par identifiants, clés d'API jamais exposées au navigateur.",
  },
  {
    icon: '⚡',
    title: 'Text-to-SQL intelligent',
    desc: "Les questions complexes sont traduites en requêtes SQL sécurisées (lecture seule) pour des calculs précis et fiables.",
  },
];

const STEPS = [
  { n: '01', title: 'Connectez-vous', desc: "Accédez à la plateforme avec vos identifiants sécurisés." },
  { n: '02', title: 'Interrogez vos données', desc: "Discutez avec l'assistant ou explorez le tableau de bord." },
  { n: '03', title: 'Décidez', desc: "Obtenez des réponses fiables pour piloter vos ressources humaines." },
];

export default function Accueil() {
  return (
    <main className="land">
      {/* Barre de navigation */}
      <motion.header
        className="land-nav"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="land-nav-inner">
          <div className="land-logo">
            <span className="land-logo-mark">📊</span>
            <span>Chatbot RH</span>
          </div>
          <nav className="land-nav-links">
            <a href="#features">Fonctionnalités</a>
            <a href="#about">À propos</a>
            <Link href="/login" className="land-cta-sm">Se connecter</Link>
          </nav>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="hero">
        <div className="hero-glow" />
        <motion.div
          className="hero-inner"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.12 } } }}
        >
          <motion.span className="hero-badge" variants={reveal}>
            ✨ Intelligence RH propulsée par GPT-4o
          </motion.span>
          <motion.h1 variants={reveal}>
            Vos données RH,<br />
            <span className="grad">enfin conversationnelles.</span>
          </motion.h1>
          <motion.p variants={reveal} className="hero-sub">
            Une plateforme unique pour interroger vos employés et leurs absences en langage
            naturel, et visualiser l&apos;essentiel sur un tableau de bord clair et vivant.
          </motion.p>
          <motion.div variants={reveal} className="hero-actions">
            <Link href="/login" className="btn-primary">
              Accéder à la plateforme →
            </Link>
            <a href="#features" className="btn-ghost">Découvrir</a>
          </motion.div>
        </motion.div>
      </section>

      {/* Bandeau de statistiques */}
      <section className="stats-band">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            className="stat"
            custom={i}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={reveal}
          >
            <div className="stat-value">
              <Counter to={s.to} suffix={s.suffix} decimals={s.decimals ?? 0} />
            </div>
            <div className="stat-label">{s.label}</div>
          </motion.div>
        ))}
      </section>

      {/* Fonctionnalités */}
      <section className="section" id="features">
        <motion.div
          className="section-head"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={reveal}
        >
          <h2>Tout ce qu&apos;il faut pour piloter vos RH</h2>
          <p>De la question spontanée à la décision éclairée, sans tableur ni SQL à écrire.</p>
        </motion.div>

        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <motion.article
              key={f.title}
              className="feature-card"
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              variants={reveal}
              whileHover={{ y: -6 }}
            >
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* À propos */}
      <section className="section about" id="about">
        <motion.div
          className="about-grid"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={{ show: { transition: { staggerChildren: 0.12 } } }}
        >
          <motion.div className="about-text" variants={reveal}>
            <span className="eyebrow">À propos</span>
            <h2>Une société tournée vers la donnée</h2>
            <p>
              Notre organisation rassemble près de <strong>2 930 collaborateurs</strong> répartis
              sur plusieurs départements et sociétés. Suivre la santé sociale d&apos;un tel effectif
              — contrats, absentéisme, pyramide des âges — demandait jusqu&apos;ici des heures
              de tableurs.
            </p>
            <p>
              <strong>Chatbot RH</strong> change la donne : il transforme des dizaines de milliers
              de lignes brutes en réponses immédiates et en visualisations vivantes, accessibles à
              toute personne autorisée, en toute confidentialité.
            </p>
            <Link href="/login" className="btn-primary">Commencer maintenant →</Link>
          </motion.div>

          <motion.div className="about-steps" variants={reveal}>
            {STEPS.map((s) => (
              <motion.div key={s.n} className="step" whileHover={{ x: 4 }}>
                <span className="step-n">{s.n}</span>
                <div>
                  <h4>{s.title}</h4>
                  <p>{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* CTA finale */}
      <section className="cta-band">
        <motion.div
          className="cta-inner"
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <h2>Prêt à explorer vos données RH ?</h2>
          <p>Connectez-vous et posez votre première question en quelques secondes.</p>
          <Link href="/login" className="btn-primary lg">Se connecter →</Link>
        </motion.div>
      </section>

      <footer className="land-footer">
        <span>📊 Chatbot RH</span>
        <span>Employés &amp; absences · propulsé par GPT-4o</span>
      </footer>
    </main>
  );
}
