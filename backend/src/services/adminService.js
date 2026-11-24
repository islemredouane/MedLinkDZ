import pool from '../config/db.js';
import * as userService from './userService.js';
import * as annonceService from './annonceService.js';
import * as ordonnanceService from './ordonnanceService.js';

// Get system-wide statistics
export const getStats = async () => {
    const totalUsers = await userService.countUsers();
    const totalAnnonces = await annonceService.countAnnonces();
    const pendingAnnonces = await annonceService.countAnnoncesByStatut('EN_ATTENTE');
    const publishedAnnonces = await annonceService.countAnnoncesByStatut('PUBLIEE');
    const pendingOrdonnances = await ordonnanceService.countPendingOrdonnances();

    return {
        totalUsers,
        totalAnnonces,
        pendingAnnonces,
        publishedAnnonces,
        pendingOrdonnances
    };
};

// Get all pending items (annonces + ordonnances waiting for approval)
export const getPendingItems = async () => {
    // Get pending annonces
    const annoncesQuery = `
        SELECT a.*, 
               m.dci, m.marque, m.prescription_required,
               c.nom AS categorie_nom,
               w.nom_fr AS wilaya_nom,
               u.nom AS user_nom, u.prenom AS user_prenom,
               o.statut AS ordonnance_statut
        FROM annonces a
        JOIN medicaments m ON a.medicament_id = m.id
        LEFT JOIN categories c ON m.categorie_id = c.id
        JOIN wilayas w ON a.wilaya_id = w.id
        JOIN users u ON a.user_id = u.id
        LEFT JOIN ordonnances o ON o.id = a.ordonnance_id
        WHERE a.statut = 'EN_ATTENTE'
        ORDER BY a.created_at DESC
    `;
    const annoncesResult = await pool.query(annoncesQuery);

    // Get pending ordonnances
    const pendingOrdonnances = await ordonnanceService.getPendingOrdonnances();

    return {
        annonces: annoncesResult.rows,
        ordonnances: pendingOrdonnances
    };
};

// Moderate an annonce (approve or reject). Its pending prescription follows the decision:
// published → prescription validated, rejected → prescription rejected. One transaction.
export const moderateAnnonce = async (annonceId, moderatorId, statut) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(`
            UPDATE annonces 
            SET moderator_id = $1, statut = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `, [moderatorId, statut, annonceId]);
        const annonce = result.rows[0];

        const ordStatut = { PUBLIEE: 'VALIDEE', REJETEE: 'REJETEE' }[statut];
        if (annonce?.ordonnance_id && ordStatut) {
            await client.query(`
                UPDATE ordonnances
                SET statut = $1, admin_id = $2, validated_at = CURRENT_TIMESTAMP
                WHERE id = $3 AND statut = 'EN_ATTENTE'
            `, [ordStatut, moderatorId, annonce.ordonnance_id]);
        }
        await client.query('COMMIT');
        return annonce;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Get all users with their annonce counts
export const getUsersWithAnnonceCounts = async () => {
    const query = `
        SELECT u.id, u.nom, u.prenom, u.email, u.phone, u.role, u.is_verified, u.is_suspended, u.created_at,
               COUNT(a.id)::int AS annonce_count
        FROM users u
        LEFT JOIN annonces a ON a.user_id = u.id
        GROUP BY u.id
        ORDER BY annonce_count DESC, u.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
};
