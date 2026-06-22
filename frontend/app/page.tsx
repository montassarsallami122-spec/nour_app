'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { motion, useInView, animate } from 'framer-motion';
import { useI18n, LangToggle } from './lib/i18n';

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
  { to: 2930, labelKey: 'land.stat.employees' },
  { to: 57425, labelKey: 'land.stat.absences' },
  { to: 37.9, suffix: ' ans', decimals: 1, labelKey: 'land.stat.age' },
  { to: 100, suffix: '%', labelKey: 'land.stat.local' },
];

const FEATURES = [
  { icon: '💬', tKey: 'land.feat.1.t', dKey: 'land.feat.1.d' },
  { icon: '📊', tKey: 'land.feat.2.t', dKey: 'land.feat.2.d' },
  { icon: '🔐', tKey: 'land.feat.3.t', dKey: 'land.feat.3.d' },
  { icon: '⚡', tKey: 'land.feat.4.t', dKey: 'land.feat.4.d' },
];

const STEPS = [
  { n: '01', tKey: 'land.step.1.t', dKey: 'land.step.1.d' },
  { n: '02', tKey: 'land.step.2.t', dKey: 'land.step.2.d' },
  { n: '03', tKey: 'land.step.3.t', dKey: 'land.step.3.d' },
];

const GALLERY = [
  { src: '/medis/building.jpg', capKey: 'land.gallery.cap.building', span: 'wide' },
  { src: '/medis/lab.jpg', capKey: 'land.gallery.cap.lab' },
  { src: '/medis/doctor.jpg', capKey: 'land.gallery.cap.doctor' },
  { src: '/medis/team.jpg', capKey: 'land.gallery.cap.team', span: 'wide' },
];

export default function Accueil() {
  const { t } = useI18n();
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
            <a href="#features">{t('land.nav.features')}</a>
            <a href="#about">{t('land.nav.about')}</a>
            <Link href="/contact">{t('land.nav.contact')}</Link>
            <LangToggle />
            <Link href="/login" className="land-cta-sm">{t('land.nav.login')}</Link>
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
            {t('land.hero.badge')}
          </motion.span>
          <motion.h1 variants={reveal}>
            {t('land.hero.title1')}<br />
            <span className="grad">{t('land.hero.title2')}</span>
          </motion.h1>
          <motion.p variants={reveal} className="hero-sub">
            {t('land.hero.sub')}
          </motion.p>
          <motion.div variants={reveal} className="hero-actions">
            <Link href="/login" className="btn-primary">
              {t('land.hero.cta')}
            </Link>
            <a href="#features" className="btn-ghost">{t('land.hero.discover')}</a>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero-showcase"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.35 }}
        >
          <img src="/medis/dna-banner.jpg" alt={t('land.hero.showcaseAlt')} />
        </motion.div>
      </section>

      {/* Bandeau de statistiques */}
      <section className="stats-band">
        {STATS.map((s, i) => (
          <motion.div
            key={s.labelKey}
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
            <div className="stat-label">{t(s.labelKey)}</div>
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
          <h2>{t('land.feat.head')}</h2>
          <p>{t('land.feat.sub')}</p>
        </motion.div>

        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <motion.article
              key={f.tKey}
              className="feature-card"
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              variants={reveal}
              whileHover={{ y: -6 }}
            >
              <span className="feature-icon">{f.icon}</span>
              <h3>{t(f.tKey)}</h3>
              <p>{t(f.dKey)}</p>
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
            <span className="eyebrow">{t('land.about.eyebrow')}</span>
            <h2>{t('land.about.title')}</h2>
            <p>
              {t('land.about.p1.pre')}<strong>{t('land.about.p1.strong')}</strong>{t('land.about.p1.post')}
            </p>
            <p>
              <strong>{t('land.about.p2.strong')}</strong>{t('land.about.p2.post')}
            </p>
            <Link href="/login" className="btn-primary">{t('land.about.cta')}</Link>
          </motion.div>

          <motion.div className="about-steps" variants={reveal}>
            {STEPS.map((s) => (
              <motion.div key={s.n} className="step" whileHover={{ x: 4 }}>
                <span className="step-n">{s.n}</span>
                <div>
                  <h4>{t(s.tKey)}</h4>
                  <p>{t(s.dKey)}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Galerie Médis */}
      <section className="section" id="gallery">
        <motion.div
          className="section-head"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          variants={reveal}
        >
          <h2>{t('land.gallery.head')}</h2>
          <p>{t('land.gallery.sub')}</p>
        </motion.div>

        <div className="gallery-grid">
          {GALLERY.map((g, i) => (
            <motion.figure
              key={g.src}
              className={`gallery-item${g.span === 'wide' ? ' wide' : ''}`}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-60px' }}
              variants={reveal}
            >
              <img src={g.src} alt={t(g.capKey)} loading="lazy" />
              <figcaption>{t(g.capKey)}</figcaption>
            </motion.figure>
          ))}
        </div>
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
          <h2>{t('land.cta.title')}</h2>
          <p>{t('land.cta.sub')}</p>
          <Link href="/login" className="btn-primary lg">{t('land.cta.btn')}</Link>
        </motion.div>
      </section>

      <footer className="land-footer">
        <span>📊 Chatbot RH</span>
        <span>{t('land.footer.tagline')}</span>
      </footer>
    </main>
  );
}
