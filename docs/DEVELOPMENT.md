# Développement local

Ce document explique comment lancer MedLink DZ sur sa machine. Il s'adresse aux personnes qui veulent
contribuer ou lire le code : pour simplement essayer le projet, utilisez la [démo en ligne](https://medlink-dz.vercel.app).

> **Prérequis** : Node.js 20.19+ ou 22.12+ (exigé par Vite 8), et PostgreSQL pour lancer l'API en local.

```bash
git clone https://github.com/islemredouane/MedLinkDZ.git
cd MedLinkDZ
npm run install:all
```

<details open>
<summary><b>🧪 Mode démo (sans backend ni base de données)</b></summary>

<br>

```bash
npm run demo        # http://localhost:5173
```

C'est exactement la version en ligne : l'API fictive (`frontend/mock/`) tourne dans le navigateur et ne contacte aucun serveur.
Les données restent dans le `localStorage` du visiteur (elles survivent aux changements de page, se réinitialisent seules au bout de 24 h
ou depuis le menu). Les photos sont réduites avant d'être gardées, et les ordonnances ne sont jamais conservées.
La fenêtre « En savoir plus » du bandeau du haut bascule entre Admin / Membre / Visiteur et réinitialise les données. Mot de passe des comptes de démo : `demo1234` (n'importe quel mot de passe est accepté) :

| Email | Compte |
|---|---|
| `admin@medlink.test` | administrateur (modération, statistiques) |
| `membre@medlink.test` | membre |
| `nonverifie@medlink.test` | email non vérifié |
| `suspendu@medlink.test` | compte suspendu |

</details>

<details>
<summary><b>⚙️ Application complète (front + API + PostgreSQL)</b></summary>

<br>

```bash
# 1. Base de données
createdb medlink
psql -d medlink -f backend/database/schema.sql

# 2. Variables d'environnement
cp backend/.env.example backend/.env       # puis renseigner DB_* et JWT_SECRET
cp frontend/.env.example frontend/.env     # VITE_API_URL=http://localhost:5000

# 3. Lancer (deux terminaux)
npm run dev:api     # API sur http://localhost:5000
npm run dev:web     # site sur http://localhost:5173
```

Au démarrage, l'API complète automatiquement le schéma (nouvelles colonnes) et remplit les catégories et les 69 wilayas.
Sans clé Brevo, les liens de vérification et de réinitialisation sont affichés dans la console du serveur.

</details>

<details>
<summary><b>🔑 Variables d'environnement</b></summary>

<br>

| Variable | Où | Rôle |
|---|---|---|
| `VITE_API_URL` | front | URL de l'API |
| `DATABASE_URL` | API | chaîne de connexion (Neon) — prioritaire sur `DB_*` |
| `DB_USER` `DB_HOST` `DB_NAME` `DB_PASS` `DB_PORT` | API | PostgreSQL local |
| `JWT_SECRET` | API | signature des sessions |
| `FRONTEND_URL` | API | adresse du site utilisée dans les liens envoyés par email |
| `BREVO_API_KEY` `SENDER_EMAIL` | API | envoi des emails (optionnel en local) |
| `PORT` | API | port d'écoute (5000 par défaut) |

</details>

## Scripts

| Commande | Action |
|---|---|
| `npm run install:all` | installe les dépendances du front et de l'API |
| `npm run demo` | site avec données fictives, sans backend |
| `npm run build:demo` | build de la version portfolio (API fictive + bandeau démo) |
| `npm run dev:web` | site connecté à l'API (`VITE_API_URL`) |
| `npm run dev:api` | API avec rechargement automatique |
| `npm run build` | build de production du front dans `frontend/dist/` |

<br>

## Aperçus de liens (Open Graph)

Chaque page reçoit ses balises `og:*` et `twitter:*` au build (titre et description de la page, plugin `socialMeta` de `frontend/vite.config.js`).
Les images 1200×630 sont dans `frontend/public/og/` ; elles se régénèrent avec :

```bash
npm run build:og          # toutes les cartes (nécessite Chrome ou Edge et une connexion pour les polices)
```

Le texte de chaque carte est dans `frontend/scripts/generate-og.mjs`, le dessin dans `frontend/scripts/og/template.html`.
L'adresse du site utilisée dans les balises est `https://medlink-dz.vercel.app` ; pour un autre domaine, définissez `VITE_SITE_URL` au build.
