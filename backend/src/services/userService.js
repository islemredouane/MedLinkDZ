import pool from '../config/db.js';

// Public profile fields. Never add password_hash here: this select is returned by
// /api/auth/me, /register and /update-profile.
const USER_PROFILE_SELECT = `
    SELECT
        u.id,
        u.nom,
        u.prenom,
        u.email,
        u.phone,
        u.role,
        u.avatar_url,
        u.is_verified,
        u.is_suspended,
        u.created_at,
        u.wilaya_id,
        w.nom_fr AS wilaya
    FROM users u
    LEFT JOIN wilayas w ON w.id = u.wilaya_id
`;

// Create a new user
export const createUser = async (userData) => {
    const { nom, prenom, email, password_hash, phone, wilaya_id } = userData;
    const query = `
        INSERT INTO users (nom, prenom, email, password_hash, phone, wilaya_id, role, is_verified) 
        VALUES ($1, $2, $3, $4, $5, $6, 'USER', false) 
        RETURNING id
    `;
    const result = await pool.query(query, [nom, prenom, email, password_hash, phone, wilaya_id ?? null]);
    return findUserById(result.rows[0].id);
};

// Find a user by email (includes password_hash for login verification only;
// loginUser strips it before responding)
export const findUserByEmail = async (email) => {
    const query = `${USER_PROFILE_SELECT.replace('u.email,', 'u.email, u.password_hash,')} WHERE u.email = $1`;
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
};

// Find a user by ID (excludes password_hash)
export const findUserById = async (id) => {
    const query = `${USER_PROFILE_SELECT} WHERE u.id = $1`;
    const result = await pool.query(query, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
};

// Update user profile info
export const updateUser = async (id, updates) => {
    const { nom, prenom, phone, avatar_url, wilaya_id } = updates;
    const query = `
        UPDATE users 
        SET nom = COALESCE($1, nom), 
            prenom = COALESCE($2, prenom), 
            phone = COALESCE($3, phone), 
            avatar_url = COALESCE($4, avatar_url),
            wilaya_id = COALESCE($5, wilaya_id)
        WHERE id = $6
        RETURNING id
    `;
    const result = await pool.query(query, [nom, prenom, phone, avatar_url, wilaya_id ?? null, id]);
    return findUserById(result.rows[0].id);
};

// Update only the user's password hash
export const updateUserPassword = async (id, password_hash) => {
    const query = `
        UPDATE users
        SET password_hash = $1
        WHERE id = $2
        RETURNING id, nom, prenom, email, phone, role, avatar_url, is_verified, created_at
    `;
    const result = await pool.query(query, [password_hash, id]);
    return result.rows[0];
};

// Verify user email address
export const verifyUserEmail = async (id) => {
    const query = `
        UPDATE users
        SET is_verified = true
        WHERE id = $1
        RETURNING id, nom, prenom, email, phone, role, avatar_url, is_verified, created_at
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
};

// Count total users (for admin stats)
export const countUsers = async () => {
    const result = await pool.query('SELECT COUNT(*) FROM users');
    return parseInt(result.rows[0].count);
};

// Toggle user suspension
export const suspendUser = async (id, suspend) => {
    const query = `
        UPDATE users
        SET is_suspended = $1
        WHERE id = $2
        RETURNING id, nom, prenom, email, role, is_suspended
    `;
    const result = await pool.query(query, [suspend, id]);
    return result.rows[0];
};

// Delete user permanently
export const deleteUser = async (id) => {
    const query = `DELETE FROM users WHERE id = $1 RETURNING id`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
};
