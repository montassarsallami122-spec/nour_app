import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variable d'environnement manquante: ${name} (voir .env.example)`);
  return v;
}

export const config = {
  llmApiKey: required('LLM_API_KEY'),
  llmBaseUrl: process.env.LLM_BASE_URL || 'https://models.inference.ai.azure.com',
  llmModel: process.env.LLM_MODEL || 'gpt-4o',
  appApiKey: required('APP_API_KEY'),
  chatMode: (process.env.CHAT_MODE || 'direct') as 'direct' | 'sql',
  port: Number(process.env.PORT || 3001),
  dbPath: process.env.DB_PATH || './data/app.db',
  employeesCsv: process.env.EMPLOYEES_CSV || '',
  absencesXlsx: process.env.ABSENCES_XLSX || '',
};
