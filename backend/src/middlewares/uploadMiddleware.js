import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the uploads directory exists (auto-create on server start)
const uploadsDir = path.join(__dirname, '../../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// Store uploaded files in Backend/uploads/
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Sanitize: remove spaces/special chars, keep extension
        const ext = path.extname(file.originalname);
        const base = path.basename(file.originalname, ext)
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9_.-]/g, '');
        const uniqueName = `${Date.now()}-${base}${ext}`;
        cb(null, uniqueName);
    }
});

// Only allow images and PDFs
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Type de fichier non autorisé. Utilisez JPG, PNG, WEBP ou PDF.'), false);
    }
};

// Max file size: 5MB
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

export default upload;

/* ---- Private uploads (prescriptions) ----
   Stored outside /uploads, which app.js serves publicly. Files are only readable through
   GET /api/ordonnances/:id/file, which checks that the requester is the owner or an admin.
   Random file names: the original name is never kept (it can contain personal data). */
export const privateUploadsDir = path.join(__dirname, '../../uploads_private/ordonnances');
fs.mkdirSync(privateUploadsDir, { recursive: true });

const privateStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, privateUploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
        cb(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`);
    }
});

export const privateUpload = multer({
    storage: privateStorage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});
