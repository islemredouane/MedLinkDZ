import { assetUrl } from '../services/api';

export function mapAnnonceCard(annonce = {}) {
  const imagePath = annonce.imageUrl || annonce.image_url || annonce.image || null;

  return {
    id: annonce.id,
    type: annonce.type === 'DON' ? 'offre' : 'demande',
    name: annonce.dci || annonce.marque || annonce.titre || 'Médicament',
    category: annonce.categorie_nom || annonce.category || 'Autre',
    wilaya: annonce.wilaya_nom || annonce.wilaya || 'N/A',
    wilayaId: annonce.wilaya_id ?? annonce.wilayaId ?? null,
    date: annonce.created_at || annonce.date || new Date().toISOString(),
    imageUrl: imagePath ? assetUrl(imagePath) : null,
    description: annonce.description || '',
  };
}