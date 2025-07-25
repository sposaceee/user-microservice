import { pool } from '../db.js';
import { v4 as uuid } from 'uuid';

export async function createUser({ id, name, email }) {
    const { rows } = await pool.query(
        `INSERT INTO users(id, name, email)
     VALUES ($1, $2, $3)
     RETURNING *`,
        [id, name, email]
    );
    return rows[0];
}

/**
 * Retrieves all users from the database (admin only)
 * @returns {Promise<Array>} Array of user objects
 */
export async function getAllUsers() {
    try {
        const { rows } = await pool.query(`
            SELECT 
                id, 
                name, 
                email, 
                role, 
                created_at, 
                profile_picture
            FROM users
            ORDER BY created_at DESC
        `);

        // Transform to camelCase for consistency with your other methods
        return rows.map(user => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.created_at,
            profilePicture: user.profile_picture
        }));

    } catch (error) {
        console.error('Error fetching all users:', error);
        throw error; // Let the controller handle the error
    }
}

export async function updateUser(id, fields) {
    // dynamisches UPDATE
    const set = Object.entries(fields)
        .map(([k, v], i) => `${k}=$${i + 2}`)
        .join(', ');
    const values = [id, ...Object.values(fields)];
    const { rows } = await pool.query(
        `UPDATE users SET ${set} WHERE id=$1 RETURNING *`,
        values
    );
    return rows[0];
}

export async function deleteUser(id) {
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
}


/* ------- Liste mit optionalem Paging ------- */
export async function listUsers({ limit = 50, offset = 0 } = {}) {
    const { rows } = await pool.query(
        `SELECT * FROM users
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
        [limit, offset]
    );
    return rows;
}

/* ------- einzelner User ------- */
export async function getUserById(id) {
    const { rows } = await pool.query(`
        SELECT id, name, email, role, created_at, profile_picture
        FROM users 
        WHERE id = $1
    `, [id]);

    const user = rows[0];
    if (!user) return undefined;

    // Optional: camelCase für das Frontend
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
        profile_picture: user.profile_picture,
    };
}


export const updateProfilePicture = async (userId, imagePath) => {
    const result = await pool.query(
        'UPDATE users SET profile_picture = $1 WHERE id = $2 RETURNING profile_picture',
        [imagePath, userId]
    );
    return result.rows[0];
};