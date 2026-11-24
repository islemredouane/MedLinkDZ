import express from 'express';
import { uploadOrdonnance, getOrdonnance, getOrdonnanceFile } from '../controllers/ordonnanceController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { privateUpload } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// All routes require a signed-in member; read access is limited to the owner and admins (see controller)
router.post('/upload', authMiddleware, privateUpload.single('ordonnance'), uploadOrdonnance);
router.get('/:id/file', authMiddleware, getOrdonnanceFile);
router.get('/:id', authMiddleware, getOrdonnance);

export default router;
