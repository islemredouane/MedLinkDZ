// server.js - Point d'entrée principal
import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { fileURLToPath } from 'url';

// 1. Initialiser dotenv au tout début en ciblant le .env à la racine
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

// 2. Importer l'application express (depuis le dossier src)
import app from './src/app.js';
import { seedDatabase } from './src/config/seeder.js';

// 3. Définir le port et démarrer l'écoute
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`Serveur démarré avec succès sur le port ${PORT}`);
    // Auto-seed the database on startup (self-healing UX)
    await seedDatabase().catch(err => console.error('Seeding database failed:', err));
});

