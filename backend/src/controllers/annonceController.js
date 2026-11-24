import * as annonceService from '../services/annonceService.js';
import * as mediaService from '../services/mediaService.js';
import * as catalogService from '../services/catalogService.js';
import * as ordonnanceService from '../services/ordonnanceService.js';

// 'YYYY-MM-DD' strings compare correctly as text
const todayISO = () => new Date().toISOString().slice(0, 10);
const isISODate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));

// GET /api/annonces
export const getAnnonces = async (req, res) => {
    try {
        const { type, wilaya_id, medicament_id, search } = req.query;
        const annonces = await annonceService.getAnnonces({ type, wilaya_id, medicament_id, search });

        res.status(200).json({ success: true, count: annonces.length, annonces });
    } catch (error) {
        console.error('Error fetching annonces:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

// GET /api/annonces/my-annonces
export const getMyAnnonces = async (req, res) => {
    try {
        const annonces = await annonceService.getAnnoncesByUserId(req.user.id);
        res.status(200).json({ success: true, count: annonces.length, annonces });
    } catch (error) {
        console.error('Error fetching user annonces:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

// GET /api/annonces/:id
export const getAnnonceById = async (req, res) => {
    try {
        const annonce = await annonceService.getAnnonceById(req.params.id);
        if (!annonce) {
            return res.status(404).json({ success: false, message: 'Annonce non trouvée.' });
        }

        // Unpublished annonces (pending, rejected…) are only visible to their author and admins
        const viewer = req.user; // set by optionalAuthMiddleware when a valid token is sent
        const isOwner = viewer && viewer.id === annonce.user_id;
        const isAdmin = viewer && viewer.role === 'ADMIN';
        if (annonce.statut !== 'PUBLIEE' && !isOwner && !isAdmin) {
            return res.status(404).json({ success: false, message: 'Annonce non trouvée.' });
        }

        // Also fetch media for this annonce
        const medias = await mediaService.getMediaByAnnonceId(annonce.id);

        // The author's phone is only shared with signed-in members (privacy policy)
        const { user_phone, ...publicFields } = annonce;
        const payload = viewer ? { ...publicFields, user_phone, medias } : { ...publicFields, medias };

        res.status(200).json({ success: true, annonce: payload });
    } catch (error) {
        console.error('Error fetching annonce:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

// POST /api/annonces
export const createAnnonce = async (req, res) => {
    try {
        let { medicament_id, medicament_name, ordonnance_id, wilaya_id, type, quantite, description, categorie_id, date_peremption } = req.body;

        if (!wilaya_id || !type || !quantite || (!medicament_id && !medicament_name)) {
            return res.status(400).json({ success: false, message: 'Champs obligatoires manquants.' });
        }

        quantite = parseInt(quantite, 10);
        if (Number.isNaN(quantite) || quantite <= 0) {
            return res.status(400).json({ success: false, message: 'Veuillez saisir une quantité entière valide.' });
        }

        wilaya_id = parseInt(wilaya_id, 10);
        if (Number.isNaN(wilaya_id)) {
            return res.status(400).json({ success: false, message: 'Wilaya invalide.' });
        }


        const wilaya = await catalogService.getWilayaById(wilaya_id);
        if (!wilaya) {
            return res.status(400).json({ success: false, message: 'Wilaya introuvable.' });
        }

        if (!['DON', 'DEMANDE'].includes(type)) {
            return res.status(400).json({ success: false, message: "Type d'annonce invalide." });
        }

        // Category (optional): must exist when sent
        let categorieId = null;
        if (categorie_id) {
            categorieId = parseInt(categorie_id, 10);
            if (Number.isNaN(categorieId) || !(await catalogService.getCategoryById(categorieId))) {
                return res.status(400).json({ success: false, message: 'Catégorie invalide.' });
            }
        }

        // Expiry date: required for offers (never share an expired medicine), ignored for requests
        let datePeremption = null;
        if (type === 'DON') {
            if (!isISODate(date_peremption)) {
                return res.status(400).json({ success: false, message: 'La date de péremption est obligatoire pour une offre.' });
            }
            if (date_peremption < todayISO()) {
                return res.status(400).json({ success: false, message: 'Ce médicament est périmé : il ne peut pas être proposé.' });
            }
            datePeremption = date_peremption;
        }

        // Resolve the medicine (custom names are created in the shared catalogue)
        let medicament;
        if (!medicament_id && medicament_name) {
            medicament = await catalogService.findOrCreateMedicament(medicament_name, categorieId);
            medicament_id = medicament.id;
        }

        // Prescription: only for requests. It must belong to the member and not be used yet.
        let ordonnanceId = null;
        if (type === 'DEMANDE' && ordonnance_id && ordonnance_id !== 'null') {
            ordonnanceId = parseInt(ordonnance_id, 10);
            const ordonnance = Number.isNaN(ordonnanceId) ? null : await ordonnanceService.getOrdonnanceById(ordonnanceId);
            if (!ordonnance || ordonnance.user_id !== req.user.id) {
                return res.status(400).json({ success: false, message: 'Ordonnance invalide.' });
            }
            if (await ordonnanceService.isOrdonnanceAttached(ordonnanceId)) {
                return res.status(400).json({ success: false, message: 'Cette ordonnance est déjà utilisée par une autre annonce.' });
            }
        }
        if (type === 'DEMANDE' && medicament?.prescription_required && !ordonnanceId) {
            return res.status(400).json({ success: false, message: 'Ce médicament nécessite une ordonnance. Ajoutez-la à votre demande.' });
        }

        const annonce = await annonceService.createAnnonce({
            user_id: req.user.id,
            medicament_id,
            ordonnance_id: ordonnanceId,
            wilaya_id,
            type,
            quantite,
            description,
            date_peremption: datePeremption
        });

        // If files were uploaded, save them as media
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const mediaType = file.mimetype.startsWith('image/') ? 'IMAGE' : 'DOCUMENT';
                await mediaService.addMedia(annonce.id, `/uploads/${file.filename}`, mediaType);
            }
        }

        res.status(201).json({ success: true, message: 'Annonce créée avec succès.', annonce });
    } catch (error) {
        console.error('Error creating annonce - Full stack:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur lors de la création.' });
    }
};

// PUT /api/annonces/:id
export const updateAnnonce = async (req, res) => {
    try {
        // Check if the annonce exists
        const existing = await annonceService.getAnnonceById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Annonce non trouvée.' });
        }

        // Check if user is the owner or an admin
        if (existing.user_id !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Vous n\'êtes pas autorisé à modifier cette annonce.' });
        }

        const updated = await annonceService.updateAnnonce(req.params.id, req.body);
        res.status(200).json({ success: true, message: 'Annonce mise à jour.', annonce: updated });
    } catch (error) {
        console.error('Error updating annonce:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};

// DELETE /api/annonces/:id
export const deleteAnnonce = async (req, res) => {
    try {
        const existing = await annonceService.getAnnonceById(req.params.id);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Annonce non trouvée.' });
        }

        // Check if user is the owner or an admin
        if (existing.user_id !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ success: false, message: 'Vous n\'êtes pas autorisé à supprimer cette annonce.' });
        }

        await annonceService.deleteAnnonce(req.params.id);
        res.status(200).json({ success: true, message: 'Annonce supprimée avec succès.' });
    } catch (error) {
        console.error('Error deleting annonce:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
};
