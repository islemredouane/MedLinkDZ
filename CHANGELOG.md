# Changelog

## 2.0.0 — Novembre 2026

Refonte complète du site et sécurisation de l'API.

### Site
- Nouveau front-end sans framework : pages HTML, **Tailwind CSS v4**, modules JavaScript, build **Vite** (remplace l'ancienne application React).
- Nouveau design system : palette blanche et verte, Space Grotesk / Inter / JetBrains Mono, composants partagés (boutons, champs, cartes, tags, notifications).
- Accueil différent pour les visiteurs (présentation, FAQ) et pour les membres connectés (recherche, publication, suivi).
- Barre de navigation mobile fixe, recherche en pilule, animations adoucies, barres de défilement flottantes.
- Pages de connexion et d'inscription en deux colonnes, inscription en deux étapes, écran « vérifiez votre boîte mail ».
- Publication en 4 étapes avec catégorie, **date de péremption** et **ordonnance**, récapitulatif adapté aux petits écrans, écran de confirmation.
- Console admin : détails de chaque annonce, consultation sécurisée des ordonnances, signalement des médicaments « sur ordonnance ».
- **Version portfolio** : une API fictive tourne dans le navigateur (aucun serveur), avec bandeau « Projet de démonstration », fenêtre d'explication, numéros factices, `noindex` et données réinitialisables. `npm run demo` en local, `npm run build:demo` pour la mise en ligne.
- **Aperçus de liens** (WhatsApp, Facebook, LinkedIn, X…) : cartes 1200×630 aux couleurs du site (accueil, recherche, annonce, FAQ) et balises Open Graph / Twitter sur chaque page. Les cartes se régénèrent avec `npm run build:og`.
- Champs de recherche de l'accueil en pilules sur téléphone, liste des wilayas qui s'ouvre vers le haut quand il n'y a pas de place, barre de défilement toujours visible (plus courte sur grand écran).

### API
- Ordonnances **privées** : stockées hors du dossier public, accessibles uniquement par leur auteur et les admins.
- Le hash du mot de passe n'est plus jamais renvoyé ; le téléphone n'est visible que par les membres connectés ; les annonces non publiées ne sont visibles que par leur auteur et les admins.
- Date de péremption obligatoire et vérifiée pour les offres, catégorie enregistrée, ordonnance obligatoire pour les médicaments signalés.
- Publier ou rejeter une demande valide ou rejette son ordonnance dans la même transaction.
- Migrations appliquées automatiquement au démarrage.

### Projet
- Nouvelle organisation : `backend/src`, `backend/database`, `docs/`, scripts à la racine, `.env.example`.
- Suppression des fichiers inutilisés et de la dépendance `nodemailer`.
- Nouveau README et documentation API à jour.
