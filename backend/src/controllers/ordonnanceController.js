import path from 'path';
import { fileURLToPath } from 'url';
import * as ordonnanceService from '../services/ordonnanceService.js';
import { privateUploadsDir } from '../middlewares/uploadMiddleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicUploadsDir = path.join(__dirname, '../../uploads'); // legacy files uploaded before the private folder

// Owner of the prescription, or an admin
const canAccess = (user, ordonnance) => user && (user.role === 'ADMIN' || ordonnance.user_id === user.id);

// POST /api/ordonnances/upload
export const uploadOrdonnance = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Fichier requis. Veuillez uploader une ordonnance (image ou PDF).' });
        }

        // Stored as a private reference, never as a public URL
        const ordonnance = await ordonnanceService.createOrdonnance(`private:${req.file.filename}`, req.user.id);

        res.status(201).json({
            success: true,
            message: 'Ordonnance uploadée avec succès. En attente de validation.',
            ordonnance: ordonnanceService.toPublicOrdonnance(ordonnance)
        });
    } catch (error) {
        console.error('Error uploading ordonnance:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur lors de l\'upload.' });
    }
};

// GET /api/ordonnances/:id  (owner or admin)
export const getOrdonnance = async (req, res) => {
    try {
        const ordonnance = await ordonnanceService.getOrdonnanceById(req.params.id);
        // Same 404 when it exists but isn't yours: don't reveal which IDs exist
        if (!ordonnance || !canAccess(req.user, ordonnance)) {
            return res.status(404).json({ success: false, message: 'Ordonnance non trouvée.' });
        }
        res.status(200).json({ success: true, ordonnance: ordonnanceService.toPublicOrdonnance(ordonnance) });
    } catch (error) {
        console.error('Error fetching ordonnance:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

// GET /api/ordonnances/:id/file  (owner or admin) — streams the document itself
export const getOrdonnanceFile = async (req, res) => {
    try {
        const ordonnance = await ordonnanceService.getOrdonnanceById(req.params.id);
        if (!ordonnance || !canAccess(req.user, ordonnance)) {
            return res.status(404).json({ success: false, message: 'Ordonnance non trouvée.' });
        }

        const ref = ordonnance.fichier_url || '';
        let filePath;
        if (ref.startsWith('private:')) filePath = path.join(privateUploadsDir, path.basename(ref.slice('private:'.length)));
        else if (ref.startsWith('/uploads/')) filePath = path.join(publicUploadsDir, path.basename(ref)); // legacy
        else return res.status(404).json({ success: false, message: 'Fichier introuvable.' });

        res.set('Cache-Control', 'private, no-store');
        res.set('X-Content-Type-Options', 'nosniff');
        res.sendFile(filePath, (err) => {
            if (err && !res.headersSent) res.status(404).json({ success: false, message: 'Fichier introuvable.' });
        });
    } catch (error) {
        console.error('Error sending ordonnance file:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};
