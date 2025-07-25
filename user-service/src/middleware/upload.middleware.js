import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// Für __dirname-Ersatz in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validierung der Dateitypen
const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
];

const fileFilter = (req, file, cb) => {
    console.log(`Überprüfe Dateityp: ${file.originalname} (${file.mimetype})`);
    if (allowedMimeTypes.includes(file.mimetype)) {
        console.log('Dateityp erlaubt.');
        cb(null, true);
    } else {
        const errMsg = `Nur folgende Bildformate erlaubt: ${allowedMimeTypes.join(', ')}`;
        console.error(`Ungültiger Dateityp: ${file.mimetype}`);
        cb(new Error(errMsg), false);
    }
};

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');

        try {
            console.log(`Erstelle Upload-Verzeichnis (falls nicht vorhanden): ${uploadDir}`);
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (err) {
            console.error(`Fehler beim Erstellen des Upload-Verzeichnisses: ${err.message}`);
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
        console.log(`Generierter Dateiname: ${filename}`);
        cb(null, filename);
    }
});

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

export const handleUploadErrors = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error(`Multer-Fehler: ${err.message}`);
        return res.status(400).json({
            error: err.code === 'LIMIT_FILE_SIZE'
                ? 'Datei zu groß (max 5MB)'
                : err.message
        });
    }

    if (err) {
        console.error(`Allgemeiner Upload-Fehler: ${err.message}`);
        return res.status(400).json({ error: err.message });
    }

    next();
};
