'use client';

// Internationalisation FR/EN, sans dépendance externe.
// - <LanguageProvider> englobe toute l'app (posé dans le layout racine).
// - useI18n() expose { lang, setLang, t }.
// - t('clé', { var }) renvoie la chaîne traduite, avec interpolation {var}.
// La langue est mémorisée dans localStorage + un cookie (lecture éventuelle côté serveur).
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type Lang = 'fr' | 'en';

type Dict = Record<string, string>;

const FR: Dict = {
  // Navigation (app privée)
  'nav.chatbot': '💬 Chatbot',
  'nav.dashboard': '📊 Tableau de bord',
  'nav.accounts': '👥 Comptes',
  'nav.rh': '🔔 Espace RH',
  'nav.logout': '⏻ Déconnexion',
  'common.loading': 'Chargement…',
  'common.loadError': 'Erreur de chargement',
  'common.backendDown': 'Backend injoignable',

  // Landing — navigation
  'land.nav.features': 'Fonctionnalités',
  'land.nav.about': 'À propos',
  'land.nav.contact': 'Contact',
  'land.nav.login': 'Se connecter',
  // Landing — hero
  'land.hero.badge': '✨ Intelligence RH propulsée par GPT-4o',
  'land.hero.title1': 'Vos données RH,',
  'land.hero.title2': 'enfin conversationnelles.',
  'land.hero.sub':
    "Une plateforme unique pour interroger vos employés et leurs absences en langage naturel, et visualiser l'essentiel sur un tableau de bord clair et vivant.",
  'land.hero.cta': 'Accéder à la plateforme →',
  'land.hero.discover': 'Découvrir',
  // Landing — stats
  'land.stat.employees': 'Employés suivis',
  'land.stat.absences': 'Absences enregistrées',
  'land.stat.age': "Âge moyen de l'effectif",
  'land.stat.local': 'Données restant locales',
  // Landing — features
  'land.feat.head': "Tout ce qu'il faut pour piloter vos RH",
  'land.feat.sub': 'De la question spontanée à la décision éclairée, sans tableur ni SQL à écrire.',
  'land.feat.1.t': 'Assistant en langage naturel',
  'land.feat.1.d':
    'Posez vos questions RH comme à un collègue. GPT-4o comprend, interroge vos données et répond avec des tableaux clairs.',
  'land.feat.2.t': 'Tableau de bord temps réel',
  'land.feat.2.d':
    "Effectifs, contrats, absentéisme, pyramide des âges — toutes vos métriques clés visualisées en un coup d'œil.",
  'land.feat.3.t': 'Sécurisé & confidentiel',
  'land.feat.3.d':
    "Vos données restent sur votre infrastructure. Accès protégé par identifiants, clés d'API jamais exposées au navigateur.",
  'land.feat.4.t': 'Text-to-SQL intelligent',
  'land.feat.4.d':
    'Les questions complexes sont traduites en requêtes SQL sécurisées (lecture seule) pour des calculs précis et fiables.',
  // Landing — about
  'land.about.eyebrow': 'À propos',
  'land.about.title': 'Une société tournée vers la donnée',
  'land.about.p1.pre': 'Notre organisation rassemble près de ',
  'land.about.p1.strong': '2 930 collaborateurs',
  'land.about.p1.post':
    " répartis sur plusieurs départements et sociétés. Suivre la santé sociale d'un tel effectif — contrats, absentéisme, pyramide des âges — demandait jusqu'ici des heures de tableurs.",
  'land.about.p2.strong': 'Chatbot RH',
  'land.about.p2.post':
    ' change la donne : il transforme des dizaines de milliers de lignes brutes en réponses immédiates et en visualisations vivantes, accessibles à toute personne autorisée, en toute confidentialité.',
  'land.about.cta': 'Commencer maintenant →',
  'land.step.1.t': 'Connectez-vous',
  'land.step.1.d': 'Accédez à la plateforme avec vos identifiants sécurisés.',
  'land.step.2.t': 'Interrogez vos données',
  'land.step.2.d': "Discutez avec l'assistant ou explorez le tableau de bord.",
  'land.step.3.t': 'Décidez',
  'land.step.3.d': 'Obtenez des réponses fiables pour piloter vos ressources humaines.',
  // Landing — galerie
  'land.hero.showcaseAlt': 'Médis — Au service de la santé',
  'land.gallery.head': 'Médis en images',
  'land.gallery.sub': "Au cœur des Laboratoires Médis : nos sites, nos équipes et notre savoir-faire au service de la santé.",
  'land.gallery.cap.building': 'Les Laboratoires Médis — Nabeul, Tunisie',
  'land.gallery.cap.lab': 'Contrôle qualité au laboratoire INPHA-Médis',
  'land.gallery.cap.doctor': 'Expertise pharmaceutique au quotidien',
  'land.gallery.cap.team': 'Nos équipes et nos partenaires internationaux',
  'land.cta.title': 'Prêt à explorer vos données RH ?',
  'land.cta.sub': 'Connectez-vous et posez votre première question en quelques secondes.',
  'land.cta.btn': 'Se connecter →',
  'land.footer.tagline': 'Employés & absences · propulsé par GPT-4o',

  // Login
  'login.title': 'Chatbot RH',
  'login.sub': "Connectez-vous pour accéder à votre tableau de bord et à l'assistant.",
  'login.username': 'Identifiant',
  'login.password': 'Mot de passe',
  'login.submit': 'Se connecter',
  'login.back': "← Retour à l'accueil",
  'login.fail': 'Échec de la connexion.',

  // Change password
  'cp.title': 'Définir un nouveau mot de passe',
  'cp.sub': 'Première connexion : choisissez un mot de passe personnel.',
  'cp.new': 'Nouveau mot de passe',
  'cp.confirm': 'Confirmer le mot de passe',
  'cp.submit': 'Enregistrer',
  'cp.mismatch': 'Les mots de passe ne correspondent pas.',

  // Dashboard
  'dash.admin.title': 'Tableau de bord RH',
  'dash.admin.sub': "Vue d'ensemble des employés & absences",
  'dash.emp.title': 'Mon espace RH',
  'dash.emp.sub': 'Vos informations personnelles · matricule {m}',
  'dash.kpi.employees': 'Employés',
  'dash.kpi.active': 'En poste',
  'dash.kpi.departed': '{n} sortis',
  'dash.kpi.avgAge': 'Âge moyen',
  'dash.kpi.absDays': "Jours d'absence",
  'dash.kpi.records': '{n} enregistrements',
  'dash.kpi.absRate': "Taux d'absentéisme",
  'dash.kpi.concerned': '{n} employés concernés',
  'dash.kpi.absDaysTotal': "Jours d'absence (total)",
  'dash.kpi.thisYear': 'Cette année',
  'dash.kpi.absHours': "Heures d'absence",
  'dash.kpi.recordsLabel': 'Enregistrements',
  'dash.chart.byDept': 'Effectif par département',
  'dash.chart.byGender': 'Répartition par sexe',
  'dash.chart.byContract': 'Par type de contrat',
  'dash.chart.byMotif': 'Absences par motif',
  'dash.chart.byYear': 'Absences par année',
  'dash.chart.byQual': 'Par qualification',
  'dash.chart.top10': 'Top 10 des plus absents',
  'dash.unit.emp': 'emp.',
  'dash.unit.abs': 'abs.',
  'dash.th.matricule': 'Matricule',
  'dash.th.fonction': 'Fonction',
  'dash.th.dept': 'Dépt.',
  'dash.th.absences': 'Absences',
  'dash.th.days': 'Jours',
  'dash.emp.contract': 'Mon contrat',
  'dash.emp.fonction': 'Fonction',
  'dash.emp.dept': 'Département',
  'dash.emp.qualification': 'Qualification',
  'dash.emp.contractType': 'Type de contrat',
  'dash.emp.company': 'Société',
  'dash.emp.costCenter': 'Centre de coût',
  'dash.emp.age': 'Âge',
  'dash.emp.contractStart': 'Début de contrat',
  'dash.emp.status': 'Statut',
  'dash.emp.inPost': '✓ En poste',
  'dash.emp.leftOn': 'Sorti le {d}',
  'dash.emp.byMotif': 'Mes absences par motif',
  'dash.emp.byYear': 'Mes absences par année',
  'dash.emp.detail': 'Détail de mes absences ({n})',
  'dash.emp.none': 'Aucune absence enregistrée. 🎉',
  'dash.th.start': 'Début',
  'dash.th.end': 'Fin',
  'dash.th.motif': 'Motif',
  'dash.th.hours': 'Heures',
  'dash.th.obs': 'Observation',

  // Chatbot
  'chat.title': 'Chatbot RH',
  'chat.sub.emp': 'Posez vos questions sur votre contrat & vos absences · GPT-4o',
  'chat.sub.staff': 'Employés & absences · propulsé par GPT-4o',
  'chat.greeting': 'Bonjour 👋 Posez-moi une question sur vos employés et leurs absences.',
  'chat.placeholder': 'Posez votre question…',
  'chat.send': 'Envoyer',
  'chat.sql': 'Voir la requête SQL',
  'chat.error': 'Erreur',
  'chat.s.admin.1': "Combien d'employés au total ?",
  'chat.s.admin.2': 'Top 5 des employés les plus absents',
  'chat.s.admin.3': 'Répartition des absences par motif',
  'chat.s.admin.4': 'Nombre de femmes vs hommes',
  'chat.s.admin.5': 'Combien de CDI dans le département AQ ?',
  'chat.s.emp.1': "Combien de jours d'absence ai-je au total ?",
  'chat.s.emp.2': 'Quelles sont mes absences cette année ?',
  'chat.s.emp.3': 'Quel est mon type de contrat ?',
  'chat.s.emp.4': 'Répartis mes absences par motif',
  'chat.s.emp.5': 'Quelle est ma fonction et mon département ?',

  // Admin — comptes
  'admin.title': 'Gestion des comptes',
  'admin.sub': 'Créez un accès employé ou un compte RH',
  'admin.new': 'Nouveau compte',
  'admin.role': 'Type de compte',
  'admin.role.employee': 'Employé',
  'admin.role.rh': 'RH',
  'admin.username': "Nom d'utilisateur",
  'admin.username.ph': 'ex : j.dupont',
  'admin.matricule': 'Matricule (employé existant)',
  'admin.matricule.ph': 'ex : 10007',
  'admin.email': 'E-mail (affiché sur la page Contact)',
  'admin.email.ph': 'ex : rh@societe.com',
  'admin.phone': 'Téléphone',
  'admin.phone.ph': 'ex : +216 71 000 000',
  'admin.password': 'Mot de passe temporaire',
  'admin.password.ph': '6 caractères min.',
  'admin.create': 'Créer le compte',
  'admin.creating': 'Création…',
  'admin.hint.employee':
    "L'employé se connectera avec ces identifiants et devra définir son propre mot de passe à la première connexion. Il ne verra que ses propres données (contrat & absences).",
  'admin.hint.rh':
    "Le compte RH a accès au tableau de bord global, au chatbot complet et aux alertes RH, mais ne peut pas créer de comptes. Son e-mail apparaît sur la page Contact.",
  'admin.created.employee': 'Compte « {u} » créé pour le matricule {m}. Mot de passe temporaire à communiquer.',
  'admin.created.rh': 'Compte RH « {u} » créé. Mot de passe temporaire à communiquer.',
  'admin.existing': 'Comptes existants ({n})',
  'admin.th.user': 'Utilisateur',
  'admin.th.matricule': 'Matricule',
  'admin.th.role': 'Rôle',
  'admin.th.contact': 'Contact',
  'admin.th.status': 'Statut',
  'admin.th.created': 'Créé le',
  'admin.th.actions': 'Actions',
  'admin.badge.admin': 'Admin',
  'admin.badge.rh': 'RH',
  'admin.badge.employee': 'Employé',
  'admin.status.reset': '🔑 Mot de passe à changer',
  'admin.status.active': '✓ Actif',
  'admin.reset': 'Réinitialiser',
  'admin.delete': 'Supprimer',
  'admin.none': "Aucun compte pour l'instant.",
  'admin.resetPrompt': 'Nouveau mot de passe temporaire pour « {u} » (6 caractères min.) :',
  'admin.resetDone': 'Mot de passe réinitialisé pour « {u} ».',
  'admin.deleteConfirm': 'Supprimer le compte « {u} » ? Cette action est irréversible.',

  // Espace RH (alertes + messages)
  'rh.title': 'Espace RH',
  'rh.sub': 'Alertes effectif & messages de contact',
  'rh.alerts': 'Alertes RH',
  'rh.retire.title': '🎂 Départs à la retraite proches',
  'rh.retire.sub': 'Employés en poste de {age} ans et plus',
  'rh.retire.none': 'Aucun départ à la retraite à signaler. ✅',
  'rh.retire.urgent': 'Urgent',
  'rh.retire.soon': 'Bientôt',
  'rh.th.age': 'Âge',
  'rh.flight.title': '⚠️ Risque de turnover (absentéisme élevé)',
  'rh.flight.sub': 'Employés en poste cumulant {d} jours d’absence ou plus',
  'rh.flight.none': 'Aucun risque de turnover individuel détecté. ✅',
  'rh.th.absDays': "Jours d'absence",
  'rh.th.records': 'Enregistrements',
  'rh.dept.title': '📉 Départements à fort turnover',
  'rh.dept.sub': 'Part des employés ayant quitté l’entreprise (≥ 15 %)',
  'rh.dept.none': 'Aucun département à fort turnover. ✅',
  'rh.th.dept': 'Département',
  'rh.th.total': 'Effectif',
  'rh.th.departed': 'Sortis',
  'rh.th.rate': 'Taux',
  // Espace RH — prévisions
  'rh.forecast.head': '🔮 Prévisions RH',
  'rh.forecast.sub': "Projection par tendance sur l'historique. Estimations indicatives, à recouper avec le terrain.",
  'rh.forecast.abs.title': "📈 Taux d'absentéisme",
  'rh.forecast.abs.sub': "Taux mensuel (jours d'absence / jours ouvrés) · 6 mois projetés",
  'rh.forecast.turn.title': '🔄 Turnover',
  'rh.forecast.turn.sub': 'Taux annuel (départs / effectif) · 2 ans projetés',
  'rh.forecast.next': 'Prochaine prévision',
  'rh.forecast.legend.history': 'Historique',
  'rh.forecast.legend.forecast': 'Prévision',
  'rh.forecast.legend.band': 'Intervalle ~90 %',
  'rh.forecast.method': 'Méthode : régression linéaire (moindres carrés) sur les données locales.',
  'rh.forecast.trend.up': 'En hausse',
  'rh.forecast.trend.down': 'En baisse',
  'rh.forecast.trend.flat': 'Stable',
  'rh.msg.title': '✉️ Messages de contact',
  'rh.msg.sub': '{n} message(s) · {u} non lu(s)',
  'rh.msg.none': 'Aucun message reçu.',
  'rh.msg.markRead': 'Marquer lu',
  'rh.msg.delete': 'Supprimer',
  'rh.msg.from': 'De',
  'rh.msg.unread': 'Non lu',
  'rh.msg.deleteConfirm': 'Supprimer ce message ?',

  // Contact
  'contact.title': 'Contactez-nous',
  'contact.sub': 'Une question ? Écrivez à notre équipe RH, nous revenons vers vous rapidement.',
  'contact.form.title': 'Envoyer un message',
  'contact.form.name': 'Votre nom',
  'contact.form.email': 'Votre e-mail',
  'contact.form.subject': 'Objet',
  'contact.form.message': 'Message',
  'contact.form.send': 'Envoyer',
  'contact.form.sending': 'Envoi…',
  'contact.form.sent': '✅ Merci ! Votre message a bien été envoyé.',
  'contact.panel.title': 'Notre équipe RH',
  'contact.panel.empty': "Les coordonnées de l'équipe RH seront bientôt disponibles.",
  'contact.panel.email': 'E-mail',
  'contact.panel.phone': 'Téléphone',
  'contact.back': "← Retour à l'accueil",
};

const EN: Dict = {
  'nav.chatbot': '💬 Chatbot',
  'nav.dashboard': '📊 Dashboard',
  'nav.accounts': '👥 Accounts',
  'nav.rh': '🔔 HR space',
  'nav.logout': '⏻ Sign out',
  'common.loading': 'Loading…',
  'common.loadError': 'Loading error',
  'common.backendDown': 'Backend unreachable',

  'land.nav.features': 'Features',
  'land.nav.about': 'About',
  'land.nav.contact': 'Contact',
  'land.nav.login': 'Sign in',
  'land.hero.badge': '✨ HR intelligence powered by GPT-4o',
  'land.hero.title1': 'Your HR data,',
  'land.hero.title2': 'finally conversational.',
  'land.hero.sub':
    'A single platform to query your employees and their absences in natural language, and visualize what matters on a clear, lively dashboard.',
  'land.hero.cta': 'Enter the platform →',
  'land.hero.discover': 'Discover',
  'land.stat.employees': 'Employees tracked',
  'land.stat.absences': 'Absences recorded',
  'land.stat.age': 'Average workforce age',
  'land.stat.local': 'Data stays local',
  'land.feat.head': 'Everything you need to run your HR',
  'land.feat.sub': 'From a spontaneous question to an informed decision — no spreadsheet or SQL to write.',
  'land.feat.1.t': 'Natural-language assistant',
  'land.feat.1.d':
    'Ask your HR questions like you would a colleague. GPT-4o understands, queries your data and answers with clear tables.',
  'land.feat.2.t': 'Real-time dashboard',
  'land.feat.2.d': 'Headcount, contracts, absenteeism, age pyramid — all your key metrics at a glance.',
  'land.feat.3.t': 'Secure & confidential',
  'land.feat.3.d':
    'Your data stays on your infrastructure. Access protected by credentials, API keys never exposed to the browser.',
  'land.feat.4.t': 'Smart text-to-SQL',
  'land.feat.4.d':
    'Complex questions are translated into safe, read-only SQL queries for precise and reliable calculations.',
  'land.about.eyebrow': 'About',
  'land.about.title': 'A data-driven company',
  'land.about.p1.pre': 'Our organization brings together nearly ',
  'land.about.p1.strong': '2,930 employees',
  'land.about.p1.post':
    ' across several departments and companies. Tracking the social health of such a workforce — contracts, absenteeism, age pyramid — used to take hours of spreadsheets.',
  'land.about.p2.strong': 'Chatbot RH',
  'land.about.p2.post':
    ' is a game changer: it turns tens of thousands of raw rows into instant answers and lively visualizations, accessible to any authorized person, in full confidentiality.',
  'land.about.cta': 'Get started now →',
  'land.step.1.t': 'Sign in',
  'land.step.1.d': 'Access the platform with your secure credentials.',
  'land.step.2.t': 'Query your data',
  'land.step.2.d': 'Chat with the assistant or explore the dashboard.',
  'land.step.3.t': 'Decide',
  'land.step.3.d': 'Get reliable answers to steer your human resources.',
  'land.hero.showcaseAlt': 'Médis — In the service of health',
  'land.gallery.head': 'Médis in pictures',
  'land.gallery.sub': 'Inside Laboratoires Médis: our sites, our teams and our expertise in the service of health.',
  'land.gallery.cap.building': 'Laboratoires Médis — Nabeul, Tunisia',
  'land.gallery.cap.lab': 'Quality control at the INPHA-Médis laboratory',
  'land.gallery.cap.doctor': 'Everyday pharmaceutical expertise',
  'land.gallery.cap.team': 'Our teams and international partners',
  'land.cta.title': 'Ready to explore your HR data?',
  'land.cta.sub': 'Sign in and ask your first question in seconds.',
  'land.cta.btn': 'Sign in →',
  'land.footer.tagline': 'Employees & absences · powered by GPT-4o',

  'login.title': 'Chatbot RH',
  'login.sub': 'Sign in to access your dashboard and the assistant.',
  'login.username': 'Username',
  'login.password': 'Password',
  'login.submit': 'Sign in',
  'login.back': '← Back to home',
  'login.fail': 'Sign-in failed.',

  'cp.title': 'Set a new password',
  'cp.sub': 'First sign-in: choose a personal password.',
  'cp.new': 'New password',
  'cp.confirm': 'Confirm password',
  'cp.submit': 'Save',
  'cp.mismatch': 'Passwords do not match.',

  'dash.admin.title': 'HR dashboard',
  'dash.admin.sub': 'Overview of employees & absences',
  'dash.emp.title': 'My HR space',
  'dash.emp.sub': 'Your personal information · ID {m}',
  'dash.kpi.employees': 'Employees',
  'dash.kpi.active': 'Active',
  'dash.kpi.departed': '{n} left',
  'dash.kpi.avgAge': 'Average age',
  'dash.kpi.absDays': 'Absence days',
  'dash.kpi.records': '{n} records',
  'dash.kpi.absRate': 'Absenteeism rate',
  'dash.kpi.concerned': '{n} employees concerned',
  'dash.kpi.absDaysTotal': 'Absence days (total)',
  'dash.kpi.thisYear': 'This year',
  'dash.kpi.absHours': 'Absence hours',
  'dash.kpi.recordsLabel': 'Records',
  'dash.chart.byDept': 'Headcount by department',
  'dash.chart.byGender': 'Breakdown by gender',
  'dash.chart.byContract': 'By contract type',
  'dash.chart.byMotif': 'Absences by reason',
  'dash.chart.byYear': 'Absences by year',
  'dash.chart.byQual': 'By qualification',
  'dash.chart.top10': 'Top 10 most absent',
  'dash.unit.emp': 'emp.',
  'dash.unit.abs': 'abs.',
  'dash.th.matricule': 'ID',
  'dash.th.fonction': 'Role',
  'dash.th.dept': 'Dept.',
  'dash.th.absences': 'Absences',
  'dash.th.days': 'Days',
  'dash.emp.contract': 'My contract',
  'dash.emp.fonction': 'Role',
  'dash.emp.dept': 'Department',
  'dash.emp.qualification': 'Qualification',
  'dash.emp.contractType': 'Contract type',
  'dash.emp.company': 'Company',
  'dash.emp.costCenter': 'Cost center',
  'dash.emp.age': 'Age',
  'dash.emp.contractStart': 'Contract start',
  'dash.emp.status': 'Status',
  'dash.emp.inPost': '✓ Active',
  'dash.emp.leftOn': 'Left on {d}',
  'dash.emp.byMotif': 'My absences by reason',
  'dash.emp.byYear': 'My absences by year',
  'dash.emp.detail': 'My absences in detail ({n})',
  'dash.emp.none': 'No absence recorded. 🎉',
  'dash.th.start': 'Start',
  'dash.th.end': 'End',
  'dash.th.motif': 'Reason',
  'dash.th.hours': 'Hours',
  'dash.th.obs': 'Note',

  'chat.title': 'Chatbot RH',
  'chat.sub.emp': 'Ask about your contract & your absences · GPT-4o',
  'chat.sub.staff': 'Employees & absences · powered by GPT-4o',
  'chat.greeting': 'Hello 👋 Ask me a question about your employees and their absences.',
  'chat.placeholder': 'Ask your question…',
  'chat.send': 'Send',
  'chat.sql': 'View SQL query',
  'chat.error': 'Error',
  'chat.s.admin.1': 'How many employees in total?',
  'chat.s.admin.2': 'Top 5 most absent employees',
  'chat.s.admin.3': 'Absences breakdown by reason',
  'chat.s.admin.4': 'Number of women vs men',
  'chat.s.admin.5': 'How many permanent contracts in the AQ department?',
  'chat.s.emp.1': 'How many absence days do I have in total?',
  'chat.s.emp.2': 'What are my absences this year?',
  'chat.s.emp.3': 'What is my contract type?',
  'chat.s.emp.4': 'Break down my absences by reason',
  'chat.s.emp.5': 'What is my role and department?',

  'admin.title': 'Account management',
  'admin.sub': 'Create an employee access or an HR account',
  'admin.new': 'New account',
  'admin.role': 'Account type',
  'admin.role.employee': 'Employee',
  'admin.role.rh': 'HR',
  'admin.username': 'Username',
  'admin.username.ph': 'e.g. j.dupont',
  'admin.matricule': 'Employee ID (existing)',
  'admin.matricule.ph': 'e.g. 10007',
  'admin.email': 'Email (shown on Contact page)',
  'admin.email.ph': 'e.g. hr@company.com',
  'admin.phone': 'Phone',
  'admin.phone.ph': 'e.g. +216 71 000 000',
  'admin.password': 'Temporary password',
  'admin.password.ph': '6 characters min.',
  'admin.create': 'Create account',
  'admin.creating': 'Creating…',
  'admin.hint.employee':
    'The employee signs in with these credentials and must set their own password on first login. They only see their own data (contract & absences).',
  'admin.hint.rh':
    'The HR account has access to the global dashboard, the full chatbot and HR alerts, but cannot create accounts. Its email appears on the Contact page.',
  'admin.created.employee': 'Account “{u}” created for ID {m}. Share the temporary password.',
  'admin.created.rh': 'HR account “{u}” created. Share the temporary password.',
  'admin.existing': 'Existing accounts ({n})',
  'admin.th.user': 'User',
  'admin.th.matricule': 'ID',
  'admin.th.role': 'Role',
  'admin.th.contact': 'Contact',
  'admin.th.status': 'Status',
  'admin.th.created': 'Created',
  'admin.th.actions': 'Actions',
  'admin.badge.admin': 'Admin',
  'admin.badge.rh': 'HR',
  'admin.badge.employee': 'Employee',
  'admin.status.reset': '🔑 Password to change',
  'admin.status.active': '✓ Active',
  'admin.reset': 'Reset',
  'admin.delete': 'Delete',
  'admin.none': 'No account yet.',
  'admin.resetPrompt': 'New temporary password for “{u}” (6 characters min.):',
  'admin.resetDone': 'Password reset for “{u}”.',
  'admin.deleteConfirm': 'Delete account “{u}”? This action is irreversible.',

  'rh.title': 'HR space',
  'rh.sub': 'Workforce alerts & contact messages',
  'rh.alerts': 'HR alerts',
  'rh.retire.title': '🎂 Upcoming retirements',
  'rh.retire.sub': 'Active employees aged {age} and over',
  'rh.retire.none': 'No upcoming retirement to report. ✅',
  'rh.retire.urgent': 'Urgent',
  'rh.retire.soon': 'Soon',
  'rh.th.age': 'Age',
  'rh.flight.title': '⚠️ Turnover risk (high absenteeism)',
  'rh.flight.sub': 'Active employees with {d} absence days or more',
  'rh.flight.none': 'No individual turnover risk detected. ✅',
  'rh.th.absDays': 'Absence days',
  'rh.th.records': 'Records',
  'rh.dept.title': '📉 High-turnover departments',
  'rh.dept.sub': 'Share of employees who left the company (≥ 15%)',
  'rh.dept.none': 'No high-turnover department. ✅',
  'rh.th.dept': 'Department',
  'rh.th.total': 'Headcount',
  'rh.th.departed': 'Left',
  'rh.th.rate': 'Rate',
  'rh.forecast.head': '🔮 HR forecasts',
  'rh.forecast.sub': 'Trend-based projection on historical data. Indicative estimates — cross-check with the field.',
  'rh.forecast.abs.title': '📈 Absenteeism rate',
  'rh.forecast.abs.sub': 'Monthly rate (absence days / working days) · 6 months projected',
  'rh.forecast.turn.title': '🔄 Turnover',
  'rh.forecast.turn.sub': 'Yearly rate (departures / headcount) · 2 years projected',
  'rh.forecast.next': 'Next forecast',
  'rh.forecast.legend.history': 'History',
  'rh.forecast.legend.forecast': 'Forecast',
  'rh.forecast.legend.band': '~90% interval',
  'rh.forecast.method': 'Method: linear regression (least squares) on local data.',
  'rh.forecast.trend.up': 'Rising',
  'rh.forecast.trend.down': 'Falling',
  'rh.forecast.trend.flat': 'Stable',
  'rh.msg.title': '✉️ Contact messages',
  'rh.msg.sub': '{n} message(s) · {u} unread',
  'rh.msg.none': 'No message received.',
  'rh.msg.markRead': 'Mark read',
  'rh.msg.delete': 'Delete',
  'rh.msg.from': 'From',
  'rh.msg.unread': 'Unread',
  'rh.msg.deleteConfirm': 'Delete this message?',

  'contact.title': 'Contact us',
  'contact.sub': 'A question? Write to our HR team and we’ll get back to you shortly.',
  'contact.form.title': 'Send a message',
  'contact.form.name': 'Your name',
  'contact.form.email': 'Your email',
  'contact.form.subject': 'Subject',
  'contact.form.message': 'Message',
  'contact.form.send': 'Send',
  'contact.form.sending': 'Sending…',
  'contact.form.sent': '✅ Thank you! Your message has been sent.',
  'contact.panel.title': 'Our HR team',
  'contact.panel.empty': 'HR team contact details will be available soon.',
  'contact.panel.email': 'Email',
  'contact.panel.phone': 'Phone',
  'contact.back': '← Back to home',
};

const DICTS: Record<Lang, Dict> = { fr: FR, en: EN };

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('fr');

  // Restaure la langue choisie (client uniquement -> évite tout décalage SSR).
  useEffect(() => {
    const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) as Lang | null;
    if (stored === 'fr' || stored === 'en') setLangState(stored);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('lang', l);
      document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = l;
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let str = DICTS[lang][key] ?? DICTS.fr[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) str = str.replace(`{${k}}`, String(v));
      return str;
    },
    [lang]
  );

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n doit être utilisé dans <LanguageProvider>.');
  return ctx;
}

// Bouton bascule FR/EN réutilisable.
export function LangToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={`lang-toggle ${className}`} role="group" aria-label="Language">
      <button
        type="button"
        className={lang === 'fr' ? 'active' : ''}
        onClick={() => setLang('fr')}
        aria-pressed={lang === 'fr'}
      >
        FR
      </button>
      <button
        type="button"
        className={lang === 'en' ? 'active' : ''}
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
      >
        EN
      </button>
    </div>
  );
}
