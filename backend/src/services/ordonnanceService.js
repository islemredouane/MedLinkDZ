import pool from '../config/db.js';

/* Prescriptions are sensitive health data:
   - each one belongs to the member who uploaded it (user_id);
   - the stored file reference (fichier_url) never leaves the server: callers use toPublicOrdonnance(). */

/** Fields safe to send to the owner / an admin (no storage path). */
export const toPublicOrdonnance = (o) => o && ({
    id: o.id,
    statut: o.statut,
    admin_comment: o.admin_comment ?? null,
    validated_at: o.validated_at ?? null,
    created_at: o.created_at ?? null,
});

// Create a new ordonnance (prescription) owned by userId
export const createOrdonnance = async (fichier_url, userId) => {
    const query = `
        INSERT INTO ordonnances (fichier_url, statut, user_id)
        VALUES ($1, 'EN_ATTENTE', $2)
        RETURNING *
    `;
    const result = await pool.query(query, [fichier_url, userId]);
    return result.rows[0];
};

// Get ordonnance by ID (raw row, includes fichier_url and user_id: server-side use only)
export const getOrdonnanceById = async (id) => {
    const result = await pool.query('SELECT * FROM ordonnances WHERE id = $1', [id]);
    return result.rows[0] || null;
};

// Is this ordonnance already attached to an annonce? (annonces.ordonnance_id is UNIQUE)
export const isOrdonnanceAttached = async (id) => {
    const result = await pool.query('SELECT 1 FROM annonces WHERE ordonnance_id = $1 LIMIT 1', [id]);
    return result.rows.length > 0;
};

// Get all pending ordonnances (for admin), without storage paths
export const getPendingOrdonnances = async () => {
    const query = `
        SELECT o.id, o.statut, o.created_at, a.id AS annonce_id,
               COALESCE(owner.nom, author.nom) AS user_nom, COALESCE(owner.prenom, author.prenom) AS user_prenom
        FROM ordonnances o
        LEFT JOIN users owner ON owner.id = o.user_id
        LEFT JOIN annonces a ON a.ordonnance_id = o.id
        LEFT JOIN users author ON author.id = a.user_id
        WHERE o.statut = 'EN_ATTENTE'
        ORDER BY o.id DESC
    `;
    const result = await pool.query(query);
    return result.rows;
};

// Update ordonnance status (admin moderation)
export const updateOrdonnanceStatus = async (id, adminId, statut, comment) => {
    const query = `
        UPDATE ordonnances
        SET admin_id = $1, statut = $2, admin_comment = $3, validated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
    `;
    const result = await pool.query(query, [adminId, statut, comment, id]);
    return result.rows[0];
};

// Count pending ordonnances (for admin stats)
export const countPendingOrdonnances = async () => {
    const result = await pool.query("SELECT COUNT(*) FROM ordonnances WHERE statut = 'EN_ATTENTE'");
    return parseInt(result.rows[0].count);
};
