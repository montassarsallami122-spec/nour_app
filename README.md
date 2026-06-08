# Chatbot RH sur mes données (Next.js + Express + GPT-4o)

Chatbot qui répond en langage naturel à des questions sur tes données RH
(**employés** + **absences**) via une API.

Deux modes (variable `CHAT_MODE` dans `backend/.env`) :
- **`direct`** (par défaut) : GPT-4o reçoit un panorama complet des données + les
  lignes brutes des matricules cités, et **répond directement** (aucun SQL généré).
- **`sql`** (text-to-SQL) : GPT-4o traduit la question en requête SQLite, on
  l'exécute en lecture seule, puis GPT-4o formule la réponse. Idéal pour des
  calculs/agrégations arbitraires et précis sur l'ensemble des données.

```
Navigateur ──> Next.js (proxy /api/chat) ──> Express (/api/chat) ──> GPT-4o
                                                   │
                                                   └──> SQLite (employees, absences)
```

## Stack
- **Frontend** : Next.js 15 + React 19 + TypeScript (`frontend/`)
- **Backend** : Express + TypeScript (`backend/`)
- **Base** : SQLite via le module intégré `node:sqlite` (Node 24 — aucune compilation native)
- **LLM** : GPT-4o via **GitHub Models** (API compatible OpenAI)

## ⚠️ Sécurité — à faire
Le token GitHub a été partagé en clair : **révoque-le et régénère-en un nouveau**
sur https://github.com/settings/tokens, puis mets-le dans `backend/.env`.
Les fichiers `.env` sont déjà dans `.gitignore` — ne jamais les commiter.

## Installation

### 1. Backend
```bash
cd backend
npm install
# Vérifier/éditer backend/.env (token, chemins des fichiers, clé APP_API_KEY)
npm run ingest      # charge le CSV + l'Excel dans data/app.db (à relancer si les données changent)
npm run dev         # démarre l'API sur http://localhost:3001
```

### 2. Frontend
```bash
cd frontend
npm install
# Vérifier frontend/.env.local (BACKEND_URL + APP_API_KEY identique au backend)
npm run dev         # interface sur http://localhost:3000
```

Ouvre http://localhost:3000 et pose tes questions.

## API

`POST /api/chat` — en-tête `x-api-key: <APP_API_KEY>`

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "x-api-key: change-me-local-dev-key" \
  -d '{"question":"Top 5 des employés les plus absents"}'
```

Réponse (mode `direct`) :
```json
{ "answer": "Voici le top 5 ...", "mode": "direct", "contextChars": 1869 }
```

Réponse (mode `sql`) :
```json
{ "answer": "Voici le top 5 ...", "sql": "SELECT ...", "rowCount": 5, "rows": [ ... ] }
```

## Données

**employees** (2 930 lignes) — matricule, rang, sexe, date_naissance, age,
adresse1-3, societe, departement, num_contrat, nature_contrat, date_contrat,
fonction, qualification, date_debut_dernier_contrat, date_fin, centre_de_cout.

**absences** (57 425 lignes) — matricule, date_debut, date_fin, motif, nbr_jours,
nbr_heures, obs. Jointure : `absences.matricule = employees.matricule`.

> Note : les données n'ont pas de colonne nom/prénom — un employé est identifié
> par son `matricule`.

## Sécurité du Text-to-SQL
- Seules les requêtes `SELECT`/`WITH` sont autorisées (mots-clés d'écriture bloqués).
- Une seule requête par appel (pas de `;` multiples).
- Auto-correction : si une requête échoue, l'erreur est renvoyée à GPT-4o pour correction (1 tentative).
- Résultats plafonnés à 200 lignes envoyées au modèle (coût/tokens maîtrisés).
