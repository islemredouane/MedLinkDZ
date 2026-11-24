import pool from '../config/db.js';
import * as annonceService from './annonceService.js';

// Get all categories
export const getAllCategories = async () => {
    const result = await pool.query('SELECT * FROM categories ORDER BY nom');
    return result.rows;
};

// Get all medicaments (with optional search and category filter)
export const getMedicaments = async (filters = {}) => {
    const { search, categorie_id } = filters;
    let query = `
        SELECT m.*, c.nom AS categorie_nom 
        FROM medicaments m 
        LEFT JOIN categories c ON m.categorie_id = c.id
        WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
        query += ` AND (m.dci ILIKE $${paramIndex} OR m.marque ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
    }

    if (categorie_id) {
        query += ` AND m.categorie_id = $${paramIndex++}`;
        params.push(categorie_id);
    }

    query += ' ORDER BY m.marque';

    const result = await pool.query(query, params);
    return result.rows;
};

// Get all wilayas
export const getAllWilayas = async () => {
    const result = await pool.query('SELECT * FROM wilayas ORDER BY id');
    return result.rows;
};

// Count all wilayas
export const countWilayas = async () => {
    const result = await pool.query('SELECT COUNT(*) FROM wilayas');
    return parseInt(result.rows[0].count, 10);
};

// Count all medicaments
export const countMedicaments = async () => {
    const result = await pool.query('SELECT COUNT(*) FROM medicaments');
    return parseInt(result.rows[0].count, 10);
};

// Public landing-page stats
export const getLandingStats = async () => {
    const [activeAnnonces, medicaments] = await Promise.all([
        annonceService.countAnnoncesByStatut('PUBLIEE'),
        countMedicaments(),
    ]);

    return {
        activeAnnonces,
        wilayas: 69,
        medicaments,
    };
};

// Get wilaya by id
export const getWilayaById = async (id) => {
    const result = await pool.query('SELECT * FROM wilayas WHERE id = $1', [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
};

// Find a medicament by name (case-insensitive) or create a new one
// categorieId (optional): the category chosen by the member. The catalogue is shared, so it is
// only applied to a new medicine, or to an existing one that has no category yet — never overwritten.
export const findOrCreateMedicament = async (name, categorieId = null) => {
    const trimmed = name.trim();
    // 1. Try exact match on marque or dci
    const found = await pool.query(
        `SELECT * FROM medicaments WHERE LOWER(marque) = LOWER($1) OR LOWER(dci) = LOWER($1) LIMIT 1`,
        [trimmed]
    );
    if (found.rows.length > 0) {
        const med = found.rows[0];
        if (categorieId && !med.categorie_id) {
            const updated = await pool.query(
                'UPDATE medicaments SET categorie_id = $1 WHERE id = $2 RETURNING *',
                [categorieId, med.id]
            );
            return updated.rows[0];
        }
        return med;
    }

    // 2. Create a new entry if not found
    const created = await pool.query(
        `INSERT INTO medicaments (dci, marque, categorie_id) VALUES ($1, $1, $2) RETURNING *`,
        [trimmed, categorieId]
    );
    return created.rows[0];
};

// Does this category exist? (validates the ID sent by the publish form)
export const getCategoryById = async (id) => {
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    return result.rows[0] || null;
};

// Admin: mark whether a medicine needs a prescription to be requested
export const setPrescriptionRequired = async (id, required) => {
    const result = await pool.query(
        'UPDATE medicaments SET prescription_required = $1 WHERE id = $2 RETURNING *',
        [required, id]
    );
    return result.rows[0] || null;
};
