
import { Router } from 'express';
import { body } from 'express-validator';
import * as userController from '../controllers/user.controller.js';
import { authenticate, authenticateAdmin } from '../middleware/user.middleware.js';
import { upload, handleUploadErrors } from '../middleware/upload.middleware.js';
const router = Router();

// --- Öffentliche Route ---
// POST /users: Erstellt einen neuen Benutzer. Keine Authentifizierung erforderlich.
router.post(
    '/',
    body('name').isLength({ min: 2 }),
    body('email').isEmail(),
    userController.create
);


// --- Geschützte Routen ---
// Alle folgenden Routen werden durch die `authenticate` Middleware geschützt.
// Sie operieren auf dem Benutzer, der durch den Token im Header identifiziert wird.

// GET /users: Ruft die Daten des eigenen Profils ab.
router.get('/', authenticate, userController.getCurrentUser);

// PATCH /users: Aktualisiert das eigene Profil.
router.patch('/', authenticate, userController.update);

// DELETE /users: Löscht das eigene Profil.
router.delete('/', authenticate, userController.remove);

//adminroutes

router.get('/admin/users', authenticateAdmin, userController.getAllUsers);

router.patch('/admin/users', authenticateAdmin, userController.updateAdmin);


router.delete('/admin/users', authenticateAdmin, userController.removeAdmin);

//PROFILBILD
router.post(
    '/profile-picture',
    authenticate,
    upload.single('image'),
    handleUploadErrors, // Muss nach upload stehen!
    userController.uploadProfilePicture
);

router.get(
    '/profile-picture',
    authenticate,
    userController.getProfilePicture
);

router.delete(
    '/profile-picture',
    authenticate,
    userController.deleteProfilePicture
);

export default router;
