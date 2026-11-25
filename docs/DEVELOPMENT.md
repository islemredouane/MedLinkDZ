# Local development

This guide explains how to run MedLink DZ on your own machine. It is meant for people who want to contribute or read the code: to simply try the project, use the [live demo](https://medlink-dz.vercel.app).

> **Requirements:** Node.js 20.19+ or 22.12+ (required by Vite 8), and PostgreSQL if you want to run the API locally.

```bash
git clone https://github.com/islemredouane/MedLinkDZ.git
cd MedLinkDZ
npm run install:all
```

<details open>
<summary><b>🧪 Demo mode (no back end, no database)</b></summary>

<br>

```bash
npm run demo        # http://localhost:5173
```

This is exactly the live site: the fictional API (`frontend/mock/`) runs inside the browser and never contacts a server.
The data stays in the visitor's `localStorage` (it survives page changes and resets itself after 24 h, or from the menu). Photos are shrunk before they are kept, and prescription files are never stored.
The **"En savoir plus"** dialog in the top bar switches between Admin / Member / Visitor and resets the data. Password of the demo accounts: `demo1234` (any password is accepted):

| Email | Account |
|---|---|
| `admin@medlink.test` | administrator (moderation, statistics) |
| `membre@medlink.test` | member |
| `nonverifie@medlink.test` | unverified email |
| `suspendu@medlink.test` | suspended account |

</details>

<details>
<summary><b>⚙️ Full application (front end + API + PostgreSQL)</b></summary>

<br>

```bash
# 1. Database
createdb medlink
psql -d medlink -f backend/database/schema.sql

# 2. Environment variables
cp backend/.env.example backend/.env       # then fill in DB_* and JWT_SECRET
cp frontend/.env.example frontend/.env     # VITE_API_URL=http://localhost:5000

# 3. Run (two terminals)
npm run dev:api     # API on http://localhost:5000
npm run dev:web     # site on http://localhost:5173
```

At startup the API completes the schema automatically (new columns) and seeds the categories and the 69 wilayas.
Without a Brevo key, the verification and password-reset links are printed in the server console.

</details>

<details>
<summary><b>🔑 Environment variables</b></summary>

<br>

| Variable | Where | Purpose |
|---|---|---|
| `VITE_API_URL` | front end | API address |
| `DATABASE_URL` | API | connection string (Neon), takes priority over `DB_*` |
| `DB_USER` `DB_HOST` `DB_NAME` `DB_PASS` `DB_PORT` | API | local PostgreSQL |
| `JWT_SECRET` | API | signs the sessions |
| `FRONTEND_URL` | API | site address used in the links sent by email |
| `BREVO_API_KEY` `SENDER_EMAIL` | API | email sending (optional locally) |
| `PORT` | API | listening port (5000 by default) |

</details>

## Scripts

| Command | Action |
|---|---|
| `npm run install:all` | installs the front end and API dependencies |
| `npm run demo` | site with fictional data, no back end |
| `npm run build:demo` | builds the portfolio version (fictional API + demo bar) |
| `npm run dev:web` | site connected to the API (`VITE_API_URL`) |
| `npm run dev:api` | API with automatic reload |
| `npm run build` | production build of the front end into `frontend/dist/` |
| `npm run build:og` | renders the link-preview cards into `frontend/public/og/` |
| `npm run build:icons` | renders the app icons from the logo |
| `npm run build:readme` | renders the README banner, stats strip and device preview |

<br>

## Link previews (Open Graph)

Every page gets its `og:*` and `twitter:*` tags at build time (page title and description, `socialMeta` plugin in `frontend/vite.config.js`).
The 1200×630 images live in `frontend/public/og/` and are regenerated with:

```bash
npm run build:og          # all the cards (needs Chrome or Edge, and a connection for the fonts)
```

The text of each card is in `frontend/scripts/generate-og.mjs`, the design in `frontend/scripts/og/template.html`.
The site address used in the tags is `https://medlink-dz.vercel.app`; for another domain, set `VITE_SITE_URL` at build time.

## Installable app (PWA)

The site installs like an app (Android, iPhone, desktop). Everything is in `frontend/public/`:

| File | Purpose |
|---|---|
| `manifest.webmanifest` | name, colors, icons, shortcuts (Rechercher, Publier, Mes annonces), screenshots for the install dialog |
| `sw.js` | service worker: network-first pages (always up to date), cached static files, never `/api/` |
| `offline.html` | page shown offline when the requested page is not cached |
| `icons/`, `apple-touch-icon.png` | icons generated from the logo |

```bash
npm run build:icons       # regenerates the icons (needs Chrome or Edge)
```

The worker is only registered in production builds (`npm run build` or `build:demo`), never with `npm run dev`, to avoid stale cached modules.
To clear the caches of every visitor after a major update, change `VERSION` at the top of `frontend/public/sw.js`.
iPhone and iPad have no install prompt: the "Installer l'app" button explains the steps (Share, then "Add to Home Screen").

## README images

The banner, the stats strip and the device preview in `.github/assets/` are rendered from HTML templates in `frontend/scripts/readme/`.
The numbers (wilayas, pages, endpoints, tables, roles) are counted from the code, and the preview comes from real screenshots of the demo build:

```bash
npm run build:demo        # the previews are taken from the demo build
npm run build:readme      # needs Chrome or Edge, and a connection for the fonts
```
