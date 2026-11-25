# Changelog

## 2.0.0: November 2026

Complete redesign of the site and hardening of the API.

### Site
- New framework-free front end: HTML pages, **Tailwind CSS v4**, JavaScript modules, **Vite** build (replaces the old React app).
- New design system: white and green palette, Space Grotesk / Inter / JetBrains Mono, shared components (buttons, fields, cards, tags, notices, toasts).
- Different home page for visitors (presentation, FAQ) and for signed-in members (search, publish, follow-up).
- Fixed mobile navigation bar, pill-shaped search, softer animations, floating scrollbars.
- Two-column sign-in and sign-up pages, two-step sign-up, "check your inbox" screen.
- 4-step publishing with category, **expiry date** and **prescription**, a review step designed for small screens, and a confirmation screen.
- Admin console: full details for each listing, secure access to prescriptions, flag for "prescription-only" medicines.
- **Portfolio demo:** a fictional API runs inside the browser (no server), with a "Projet de démonstration" bar, an explanation dialog, fake phone numbers, `noindex` and resettable data. `npm run demo` locally, `npm run build:demo` for the live site.
- **Link previews** (WhatsApp, Facebook, LinkedIn, X…): 1200×630 cards in the site's colors (home, search, listing, FAQ) and Open Graph / Twitter tags on every page. Cards are regenerated with `npm run build:og`.
- **Installable app (PWA):** manifest, icons (including an Android "maskable" icon and an iPhone icon), service worker, offline page, visited pages available without a network, and an "Installer l'app" button. Icons are regenerated with `npm run build:icons`.
- Pill-shaped search fields on the phone home page, wilaya list that opens upwards when there is no room below, always-visible scrollbar (shorter on large screens).

### API
- **Private** prescriptions: stored outside the public folder and readable only by their owner and by admins.
- The password hash is never returned any more; a phone number is visible to signed-in members only; unpublished listings are visible to their owner and to admins only.
- Expiry date required and validated for offers, category saved, prescription required for flagged medicines.
- Publishing or rejecting a request validates or rejects its prescription in the same transaction.
- Migrations applied automatically at startup.

### Project
- New layout: `backend/src`, `backend/database`, `docs/`, scripts at the root, `.env.example`.
- Removal of unused files and of the `nodemailer` dependency.
- README rewritten in English with a rendered banner, stats strip and device preview (`npm run build:readme`); API documentation brought up to date; changelog translated to English.
