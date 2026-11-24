import pkg from 'pg';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const { Pool, types } = pkg;

// Return DATE columns as plain 'YYYY-MM-DD' strings. The default turns them into JS Dates at
// local midnight, which serialise to the previous day in UTC (e.g. expiry dates shifting by one).
types.setTypeParser(1082, (value) => value);

// Configurer les variables d'environnement correctement avec le chemin ciblant la racine du "Backend/"
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = process.env.DATABASE_URL 
    ? new Pool({ 
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for cloud databases like Neon/Render
      })
    : new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASS,
        port: process.env.DB_PORT,
    });

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export default pool;
