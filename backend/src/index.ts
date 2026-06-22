import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { answerQuestion } from './chat.js';
import { answerQuestionDirect } from './directChat.js';
import { answerQuestionScoped } from './scoped.js';
import { buildStats, buildEmployeeStats, buildNotifications, buildForecast } from './stats.js';
import { verifyPassword, signToken, verifyToken, type SessionPayload } from './auth.js';
import {
  initAccountsSchema,
  seedAdmin,
  getByUsername,
  getById,
  createAccount,
  listAccounts,
  deleteAccount,
  resetPassword,
  setOwnPassword,
  listRhContacts,
} from './accounts.js';
import {
  initMessagesSchema,
  createMessage,
  listMessages,
  countUnread,
  markRead,
  deleteMessage,
} from './messages.js';

const app = express();
app.use(cors());
app.use(express.json());

// Augmente Request avec l'utilisateur authentifié (issu du jeton de session).
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionPayload;
    }
  }
}

// --- Auth par clé d'API (canal de confiance Next.js -> backend) ----------------
function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const key = req.header('x-api-key');
  if (key !== config.appApiKey) {
    return res.status(401).json({ error: 'Clé d\'API invalide ou manquante (en-tête x-api-key).' });
  }
  next();
}

// --- Identité de l'utilisateur (jeton de session signé, en-tête x-session-token).
// N'échoue PAS si absent : pose simplement req.user quand le jeton est valide.
function loadUser(req: Request, _res: Response, next: NextFunction) {
  req.user = verifyToken(req.header('x-session-token')) ?? undefined;
  next();
}

function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Session invalide ou expirée.' });
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Réservé aux administrateurs.' });
  next();
}

// Personnel RH : admin OU rh. Accès aux vues globales (tableau de bord, alertes,
// messages de contact). Exclut les employés (limités à leurs propres données).
function requireStaff(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin' && req.user?.role !== 'rh')
    return res.status(403).json({ error: 'Réservé au personnel RH.' });
  next();
}

const isStaff = (req: Request) => req.user?.role === 'admin' || req.user?.role === 'rh';

app.use(requireApiKey, loadUser);

// Santé (publique au sens applicatif, mais derrière la clé d'API).
app.get('/health', (_req, res) => res.json({ status: 'ok', model: config.llmModel }));

// --- Authentification ----------------------------------------------------------
// POST /api/auth/login  body: { username, password } -> { token, role, mustReset }
app.post('/api/auth/login', (req: Request, res: Response) => {
  const username = (req.body?.username ?? '').toString().trim();
  const password = (req.body?.password ?? '').toString();
  const acc = getByUsername(username);
  if (!acc || !verifyPassword(password, acc.password_hash)) {
    return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
  }
  const token = signToken({
    sub: acc.id,
    matricule: acc.matricule,
    role: acc.role,
    mustReset: acc.must_reset === 1,
  });
  res.json({ token, role: acc.role, mustReset: acc.must_reset === 1, username: acc.username });
});

// GET /api/me -> profil minimal de l'utilisateur connecté
app.get('/api/me', requireUser, (req: Request, res: Response) => {
  const acc = getById(req.user!.sub);
  if (!acc) return res.status(401).json({ error: 'Compte introuvable.' });
  res.json({
    id: acc.id,
    username: acc.username,
    role: acc.role,
    matricule: acc.matricule,
    email: acc.email,
    phone: acc.phone,
    mustReset: acc.must_reset === 1,
  });
});

// POST /api/auth/change-password  body: { newPassword } -> nouveau jeton (mustReset levé)
app.post('/api/auth/change-password', requireUser, (req: Request, res: Response) => {
  const newPassword = (req.body?.newPassword ?? '').toString();
  try {
    setOwnPassword(req.user!.sub, newPassword);
  } catch (e) {
    return res.status(400).json({ error: (e as Error).message });
  }
  const acc = getById(req.user!.sub)!;
  const token = signToken({ sub: acc.id, matricule: acc.matricule, role: acc.role, mustReset: false });
  res.json({ ok: true, token });
});

// --- Administration des comptes (admin uniquement) -----------------------------
app.get('/api/admin/accounts', requireUser, requireAdmin, (_req: Request, res: Response) => {
  res.json({ accounts: listAccounts() });
});

app.post('/api/admin/accounts', requireUser, requireAdmin, (req: Request, res: Response) => {
  const { username, password, matricule, role, email, phone } = req.body ?? {};
  // L'admin peut créer un employé ou un RH (pas d'autre admin via l'UI).
  const safeRole = role === 'rh' ? 'rh' : 'employee';
  const mat = Number(matricule);
  try {
    const acc = createAccount({
      username: (username ?? '').toString(),
      password: (password ?? '').toString(),
      matricule: Number.isFinite(mat) ? Math.trunc(mat) : 0,
      role: safeRole,
      email: (email ?? '').toString(),
      phone: (phone ?? '').toString(),
    });
    res.status(201).json({
      account: { id: acc.id, username: acc.username, matricule: acc.matricule, role: acc.role, email: acc.email, phone: acc.phone },
    });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.post('/api/admin/accounts/:id/reset', requireUser, requireAdmin, (req: Request, res: Response) => {
  try {
    resetPassword(Number(req.params.id), (req.body?.password ?? '').toString());
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

app.delete('/api/admin/accounts/:id', requireUser, requireAdmin, (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (id === req.user!.sub) return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
  deleteAccount(id);
  res.json({ ok: true });
});

// --- Tableau de bord : agrégats globaux (admin) ou vue personnelle (employé) ----
app.get('/api/stats', requireUser, (req: Request, res: Response) => {
  try {
    // admin ET rh voient les agrégats globaux ; l'employé voit sa vue personnelle.
    if (isStaff(req)) {
      res.json({ scope: 'admin', ...buildStats() });
    } else {
      res.json({ scope: 'employee', employee: buildEmployeeStats(req.user!.matricule) });
    }
  } catch (e) {
    console.error('Erreur /api/stats:', e);
    res.status(500).json({ error: (e as Error).message });
  }
});

// --- Alertes RH (retraite & turnover) : admin & rh uniquement ------------------
app.get('/api/notifications', requireUser, requireStaff, (_req: Request, res: Response) => {
  try {
    res.json(buildNotifications());
  } catch (e) {
    console.error('Erreur /api/notifications:', e);
    res.status(500).json({ error: (e as Error).message });
  }
});

// --- Prévisions RH (absentéisme & turnover) : admin & rh uniquement ------------
app.get('/api/forecast', requireUser, requireStaff, (_req: Request, res: Response) => {
  try {
    res.json(buildForecast());
  } catch (e) {
    console.error('Erreur /api/forecast:', e);
    res.status(500).json({ error: (e as Error).message });
  }
});

// --- Chatbot : pleine puissance (admin) ou HARD-SCOPED par matricule (employé) --
app.post('/api/chat', requireUser, async (req: Request, res: Response) => {
  const question = (req.body?.question ?? '').toString().trim();
  if (!question) return res.status(400).json({ error: 'Champ "question" requis.' });
  try {
    let result;
    if (isStaff(req)) {
      // admin & rh : IA pleine puissance sur l'ensemble des données.
      result = config.chatMode === 'sql' ? await answerQuestion(question) : await answerQuestionDirect(question);
    } else {
      // L'employé obtient l'IA complète (text-to-SQL) mais sur une connexion
      // isolée ne contenant que SES données : aucune fuite possible.
      result = await answerQuestionScoped(question, req.user!.matricule);
    }
    res.json(result);
  } catch (e) {
    console.error('Erreur /api/chat:', e);
    res.status(500).json({ error: (e as Error).message });
  }
});

// --- Contact (page publique) ---------------------------------------------------
// GET /api/contacts -> coordonnées des RH (nom, e-mail, téléphone). Derrière la
// clé d'API mais SANS session : la page Contact est publique.
app.get('/api/contacts', (_req: Request, res: Response) => {
  res.json({ contacts: listRhContacts() });
});

// POST /api/contact -> enregistre un message envoyé via le formulaire de contact.
app.post('/api/contact', (req: Request, res: Response) => {
  const { name, email, subject, body } = req.body ?? {};
  try {
    const msg = createMessage({
      name: (name ?? '').toString(),
      email: (email ?? '').toString(),
      subject: (subject ?? '').toString(),
      body: (body ?? '').toString(),
    });
    res.status(201).json({ ok: true, id: msg.id });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// --- Boîte de réception des messages : admin & rh ------------------------------
app.get('/api/admin/messages', requireUser, requireStaff, (_req: Request, res: Response) => {
  res.json({ messages: listMessages(), unread: countUnread() });
});

app.post('/api/admin/messages/:id/read', requireUser, requireStaff, (req: Request, res: Response) => {
  markRead(Number(req.params.id));
  res.json({ ok: true });
});

app.delete('/api/admin/messages/:id', requireUser, requireStaff, (req: Request, res: Response) => {
  deleteMessage(Number(req.params.id));
  res.json({ ok: true });
});

// Initialise les tables (comptes + messages) + admin de bootstrap, puis démarre.
initAccountsSchema();
initMessagesSchema();
seedAdmin();

app.listen(config.port, () => {
  console.log(`🚀 Backend prêt sur http://localhost:${config.port}`);
  console.log(`   Mode chat (admin): ${config.chatMode}  ·  Modèle: ${config.llmModel}`);
});
