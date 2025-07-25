
import axios from 'axios';
import * as User from '../models/user.model.js'; // Pfad anpassen

const AUTH_SERVICE_URL = 'http://auth-service:5000/auth/verify';

export async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        //console.log('authheader03003', authHeader);
        if (!authHeader) {
            return res.status(401).json({ message: 'Authorization-Header fehlt' });
        }

        const authResponse = await axios.post(AUTH_SERVICE_URL, {}, {
            headers: { 'authorization': authHeader },
        });

        const { user_id: userId } = authResponse.data;

        if (!userId) {
            return res.status(401).json({ message: 'Authentifizierung fehlgeschlagen: Ungültiger Token' });
        }

        const user = await User.getUserById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Der authentifizierte Benutzer wurde nicht gefunden' });
        }

        // Der authentifizierte Benutzer wird für die nachfolgenden Controller verfügbar gemacht.
        req.user = user;
        next();

    } catch (error) {
        if (error.response && error.response.status === 401) {
            return res.status(401).json({ message: 'Authentifizierung fehlgeschlagen: Token vom Dienst abgelehnt' });
        }
        console.error('Fehler in der Authentifizierungs-Middleware:', error.message);
        return res.status(500).json({ message: 'Interner Serverfehler bei der Authentifizierung' });
    }
}

export async function authenticateAdmin(req, res, next) {
    try {
        // First verify the token using existing authentication
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ message: 'Authorization header missing' });
        }

        // Verify token with auth service
        const authResponse = await axios.post(AUTH_SERVICE_URL, {}, {
            headers: { 'authorization': authHeader },
        });

        const { user_id: userId } = authResponse.data;

        if (!userId) {
            return res.status(401).json({ message: 'Authentication failed: Invalid token' });
        }

        // Get full user data including role
        const user = await User.getUserById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Authenticated user not found' });
        }

        // Check if user has admin role
        //console.log('admin===', user.role);
        if (user.role !== 'admin') {
            return res.status(403).json({
                message: 'Forbidden: Admin privileges required' ,
                error: 'ADMIN_ACCESS_REQUIRED'
            });
        }

        // Attach user to request and proceed
        req.user = user;
        next();

    } catch (error) {
        if (error.response && error.response.status === 401) {
            return res.status(401).json({
                message: 'Authentication failed: Token rejected',
                error: 'INVALID_TOKEN'
            });
        }

        console.error('Error in admin authentication middleware:', error.message);
        return res.status(500).json({
            message: 'Internal server error during authentication',
            error: 'AUTHENTICATION_ERROR'
        });
    }
}