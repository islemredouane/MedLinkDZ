# 🏥 MedLink DZ 💊

Plateforme algérienne de partage de médicaments, pensée pour relier les personnes ayant des médicaments non utilisés avec celles qui en ont besoin, à travers les **58 wilayas d’Algérie 🇩🇿**.

## Déploiement

- Frontend en production: https://medlink-dz.vercel.app/
- Backend API: hébergé sur Render
- Base de données: hébergée sur Neon 

## Versions actuelles

![React](https://img.shields.io/badge/React-19.2.5-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.0.10-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-008C99?style=for-the-badge&logo=postgresql&logoColor=white)
![Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

---

## Aperçu

MedLink DZ est une application web full-stack qui permet de:

- publier des annonces de médicaments
- rechercher des médicaments disponibles
- gérer un profil utilisateur complet
- modérer les annonces et les ordonnances côté admin

L’application repose sur une architecture moderne:

- Frontend: React + Vite
- Backend: Node.js + Express
- Base de données: PostgreSQL sur Neon
- Authentification: JWT

---

## Stack technique

### Frontend

| Technologie | Version / rôle |
|---|---|
| React | 19.2.5 |
| React DOM | 19.2.5 |
| Vite | 8.0.10 |
| React Router DOM | 7.14.2 |
| Framer Motion | 12.38.0 |
| Axios | 1.15.2 |
| Lucide React | 1.11.0 |

### Backend

| Technologie | Version / rôle |
|---|---|
| Node.js | Runtime |
| Express | 4.19.2 |
| pg | 8.11.5 |
| bcryptjs | 3.0.3 |
| jsonwebtoken | 9.0.3 |
| multer | 2.1.1 |
| nodemailer | 6.10.1 |
| dotenv | 16.6.1 |

---

## Fonctionnalités

### Utilisateurs

- inscription et vérification email
- connexion sécurisée avec JWT
- réinitialisation du mot de passe
- modification du profil
- publication et gestion des annonces
- recherche filtrée par wilaya, catégorie, type et texte

### Administrateurs

- dashboard statistiques
- validation et rejet des annonces
- gestion des utilisateurs
- contrôle des ordonnances

### Public

- consultation des annonces publiées
- recherche de médicaments
- accès aux pages d’information et légales

---

## Architecture

```txt
MedLinkDZ/
├── frontend/   → React + Vite SPA
└── backend/    → Node.js + Express REST API
```

Le frontend communique avec le backend via une API REST JSON et des uploads multipart/form-data. Le backend se connecte à Neon avec `DATABASE_URL` quand la base est déployée, et garde un mode local compatible via les variables `DB_*`.

---

## Configuration

### Frontend `.env`

```env
VITE_API_URL=https://<your-render-backend>.onrender.com
```

En local, tu peux utiliser:

```env
VITE_API_URL=http://localhost:5000
```

### Backend `.env`

#### Production sur Render + Neon

```env
DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=require
PORT=5000
JWT_SECRET=your_secret_key
FRONTEND_URL=https://medlink-dz.vercel.app

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
EMAIL_FROM=your@gmail.com
```

#### Développement local

```env
DB_USER=postgres
DB_HOST=localhost
DB_NAME=Project
DB_PASS=your_password
DB_PORT=5432

PORT=5000
JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:5173
```

---

## Installation locale

```bash
git clone <url-du-repo>
cd MedLinkDZ
npm run install:all
```

---

## Lancement en local

### Backend

```bash
cd backend
npm run dev
```

### Frontend

```bash
cd frontend
npm run dev
```

### Build frontend

```bash
cd frontend
npm run build
```

---

## Base de données

En local, tu peux créer la base puis appliquer le schéma:

```sql
CREATE DATABASE "Project";
```

```bash
psql -U postgres -d Project -f backend/DataBase/schema.sql
```

Si tu utilises Neon en production, récupère simplement la chaîne de connexion `DATABASE_URL` depuis le dashboard Neon et configure-la dans Render.

---

## Structure du projet

```txt
README.md
backend/
  server.js
  logic/
    config/
    controllers/
    middlewares/
    routes/
    services/
    utils/
  DataBase/
frontend/
  src/
    components/
    context/
    hooks/
    pages/
    services/
    styles/
```

---

## Notes de déploiement

- Le frontend est déployé sur Vercel à l’adresse publique `https://medlink-dz.vercel.app/`.
- Le backend est déployé sur Render et doit exposer l’URL utilisée dans `VITE_API_URL`.
- La base de données PostgreSQL est hébergée sur Neon et utilisée via `DATABASE_URL`.
- Le backend active le SSL pour les bases cloud comme Neon.

---

## Auteur

MedLink DZ - projet full-stack de partage de médicaments pour l’Algérie.