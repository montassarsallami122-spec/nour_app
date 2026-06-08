import OpenAI from 'openai';
import { config } from './config.js';

// GitHub Models expose une API compatible OpenAI -> on réutilise le SDK officiel.
// Le token GitHub (ghp_...) sert de clé d'API ; baseURL pointe vers GitHub Models.
export const llm = new OpenAI({
  apiKey: config.llmApiKey,
  baseURL: config.llmBaseUrl,
});

export const MODEL = config.llmModel;
