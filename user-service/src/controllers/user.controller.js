
import { validationResult } from 'express-validator';
import * as User from '../models/user.model.js';
import axios from "axios";
import path from "path";
import { fileURLToPath } from 'url';
import {deleteUser, updateProfilePicture, updateUser} from '../models/user.model.js';
import { upload } from '../middleware/upload.middleware.js';


// Für __dirname-Ersatz in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const checkHealth = async (req, res, next) => {
    try {
        // 1. Prüfe die Datenbankverbindung mit einer einfachen, schnellen Abfrage


        // 2. Wenn alles gut geht, sende eine Erfolgsantwort
        res.status(200).json({
            status: 'ok',
            message: 'Service is running and database connection is healthy.'
        });
    } catch (error) {
        // 5. Wenn die DB-Abfrage fehlschlägt, sende einen Server-Fehler
        // Docker/Kubernetes wird dies als 'unhealthy' erkennen
        console.error('Health check failed:', error);
        res.status(503).json({ // 503 Service Unavailable
            status: 'error',
            message: 'Service is running, but database connection failed.'
        });
    }
};


// POST /users - Erstellt einen neuen Benutzer (keine Authentifizierung nötig)
export async function create(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const user = await User.createUser(req.body);
        return res.status(201).json(user);
    } catch (err) {
        if (err.code === '23505') { // Postgres UNIQUE violation
            return res.status(409).json({ message: 'E-Mail bereits vergeben' });
        }
        return next(err);
    }
}

// GET /users - Gibt die Daten des aktuell authentifizierten Benutzers zurück
export function getCurrentUser(req, res) {
    // Die Middleware `authenticate` hat bereits sichergestellt, dass `req.user` existiert.
    // Wir geben einfach das Benutzerobjekt zurück.
    res.status(200).json(req.user);
}

export const getAllUsers = async (req, res) => {
    try {
        // You might want to extract pagination/filter params from query string
        // const { page, limit, role } = req.query;
        const users = await User.getAllUsers(/* { page, limit, role } */);
        res.status(200).json(users);
    } catch (error) {
        console.error('Error in getAllUsers controller:', error);
        res.status(500).json({
            message: 'Failed to retrieve users',
            error: error.message
        });
    }
};
// PATCH /users - Aktualisiert den aktuell authentifizierten Benutzer
export async function update(req, res, next) {
    try {
        // Die ID des zu aktualisierenden Benutzers wird direkt aus dem
        // `req.user` Objekt genommen, das von der Middleware gesetzt wurde.
        const userIdFromToken = req.user.id;
        const user = await User.updateUser(userIdFromToken, req.body);
        return res.json(user);
    } catch (err) {
        return next(err);
    }
}

// DELETE /users - Löscht den aktuell authentifizierten Benutzer
export async function remove(req, res, next) {
    try {
        // The user ID comes from the token, validated by upstream middleware.
        const userIdFromToken = req.user.id;
        const authHeader = req.headers['authorization'];
        // Failsafe: Ensure the auth header exists
        if (!authHeader) {
            const err = new Error('Authorization header is missing');
            err.status = 401;
            throw err;
        }

        // Step 1: Call the Authentication Service to delete the user's credentials.
        // We make a DELETE request to our new, secure endpoint in the Auth service.
        const authResponse = await axios.delete('http://auth-service:5000/auth/delete-user', {
            headers: { 'Authorization': authHeader },
            // Send refreshToken in the body of the DELETE request
            //validateStatus: () => true, // Handle all status codes manually
        });

        // Step 2: Check if the Auth Service successfully deleted the user.
        // A 204 response means success. Anything else is a failure.
        if (authResponse.status !== 204) {
            const err = new Error('Failed to delete user from authentication service.');
            // Propagate the status and error details from the auth service.
            err.status = authResponse.status;
            err.details = authResponse.data;
            throw err;
        }

        // Step 3: If auth deletion was successful, delete the user profile from this service's DB.
        await User.deleteUser(userIdFromToken);

        // Step 4: Return 204 No Content to the client, indicating complete success.
        return res.status(204).end();

    } catch (err) {
        // Pass any error (from axios, our own logic, or the DB) to the error handler.
        return next(err);
    }
}



// Upload
export const uploadProfilePicture = async (req, res) => {
    try {
        const imagePath = `/uploads/${req.file.filename}`;
        console.log("req.user:", req.user);
        const updatedUser = await User.updateProfilePicture(req.user.id, imagePath);

        res.json(updatedUser);
    } catch (err) {
        console.error("Fehler beim Upload:", err);
        res.status(500).json({ error: 'Upload failed', details: err.message });

    }
};

// Abrufen
export const getProfilePicture = async (req, res) => {
    const user = await User.getUserById(req.user.id);
    if (!user?.profile_picture) return res.status(404).end();
    res.sendFile(path.join(__dirname, `../../src/${user.profile_picture}`));
};

// Löschen
export const deleteProfilePicture = async (req, res) => {
    await UserModel.clearProfilePicture(req.user.id);
    res.status(204).end();
};



// Update user by ID (admin only)
export const updateAdmin = async (req, res) => {
    try {
        const { id, ...updateData } = req.body;

        if (!id) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Remove sensitive fields that shouldn't be updated this way
        delete updateData.password;
        delete updateData.id;

        // First update in user database
        const updatedUser = await updateUser(id, updateData);

        if (updateData.email || updateData.username) {
            try {
                const authResponse = await fetch('http://auth-service:5000/auth/admin/update', {
                    method: 'PATCH',
                    headers: {
                        'Authorization': req.headers['authorization'],
                        'Content-Type': 'application/json',
                        'X-Requested-By': 'user-service'
                    },
                    body: JSON.stringify({
                        user_id: id,
                        updates: {
                            email: updateData.email,
                            username: updateData.username
                        }
                    })
                });

                if (!authResponse.ok) {
                    const errorData = await authResponse.json().catch(() => ({}));
                    throw new Error(
                        errorData.message ||
                        `Auth service responded with status ${authResponse.status}`
                    );
                }

                const authData = await authResponse.json();
                console.log('Auth service update successful:', authData);

            } catch (error) {
                console.error('Auth service update failed:', error);
                throw new Error(`Failed to update auth service: ${error.message}`);
            }
        }

        res.status(200).json(updatedUser);  // <-- This was missing in your original code

    } catch (error) {
        res.status(400).json({
            message: 'Failed to update user',
            error: error.message
        });
    }
};

// Delete user by ID (admin only)
export const removeAdmin = async (req, res) => {
    try {
        const { id } = req.body;
        //console.log('reqbdy',req.body); //reqbdy {}

        if (!id) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // First delete from auth service using admin endpoint
        await axios.delete(`http://auth-service:5000/auth/admin/delete-user`, {
            headers: {
                'Authorization': req.headers['authorization'],
                'Content-Type': 'application/json'
            },
            data: { user_id: id } // Match your auth service expected format
        });

        // Then delete from user database
        await deleteUser(id);

        res.status(204).end();
    } catch (error) {
        let status = 400;
        let message = 'Failed to delete user';

        if (error.response) {
            status = error.response.status;
            message = error.response.data.message || message;
        }

        res.status(status).json({
            message,
            error: error.message
        });
    }
};