import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { answerQuestion } from './chat.js';
import { answerQuestionDirect } from './directChat.js';
import { buildStats } from './stats.js';

const app = express();
app.use(cors());
app.use(express.json());

// --- Auth par clé d'API (en-tête x-api-key) ------------------------------------
function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const key = req.header('x-api-key');
  if (key !== config.appApiKey) {
    return res.status(401).json({ error: 'Clé d\'API invalide ou manquante (en-tête x-api-key).' });
  }
  next();
}

// Santé (publique)
app.get('/health', (_req, res) => res.json({ status: 'ok', model: config.llmModel }));

// --- Tableau de bord : agrégats RH (JSON) --------------------------------------
// GET /api/stats  header: x-api-key
app.get('/api/stats', requireApiKey, (_req: Request, res: Response) => {
  try {
    res.json(buildStats());
  } catch (e) {
    console.error('Erreur /api/stats:', e);
    res.status(500).json({ error: (e as Error).message });
  }
});

// --- Endpoint principal du chatbot ---------------------------------------------
// POST /api/chat  body: { "question": "..." }  header: x-api-key
app.post('/api/chat', requireApiKey, async (req: Request, res: Response) => {
  const question = (req.body?.question ?? '').toString().trim();
  if (!question) {
    return res.status(400).json({ error: 'Champ "question" requis.' });
  }
  try {
    const result =
      config.chatMode === 'sql'
        ? await answerQuestion(question)
        : await answerQuestionDirect(question);
    res.json(result);
  } catch (e) {
    console.error('Erreur /api/chat:', e);
    res.status(500).json({ error: (e as Error).message });
  }
});

app.listen(config.port, () => {
  console.log(`🚀 Backend prêt sur http://localhost:${config.port}`);
  console.log(`   POST /api/chat  (en-tête x-api-key requis)`);
  console.log(`   Mode: ${config.chatMode}  ·  Modèle: ${config.llmModel} via ${config.llmBaseUrl}`);
});
