import { useEffect, useState } from 'react';
import { Loader2, Check, X, AlertCircle } from 'lucide-react';
import { adminApi } from '../../services/api';
import './AdminLayout.css';

export default function ModerationPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.pending();
      const list = Array.isArray(data?.annonces) ? data.annonces : [];
      setItems(list);
    } catch (err) {
      setError('Erreur au chargement des annonces');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const moderate = async (id, action) => {
    setBusyId(id);
    setError(null);
    try {
      const statut = action === 'approve' ? 'PUBLIEE' : 'REJETEE';
      await adminApi.moderateAnnonce(id, statut);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      setError(`Erreur lors de ${action === 'approve' ? 'l\'approbation' : 'le rejet'}`);
      console.error(err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 className="admin-page-title">Modération</h1>
      <p className="admin-page-sub">Annonces en attente de validation</p>

      {error && (
        <div className="admin-alert admin-alert--error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="admin-card glass-bright admin-moderation-panel">
        <div className="admin-moderation-panel__head">
          <div>
            <h2 className="admin-moderation-panel__title">Files de validation</h2>
            <p className="admin-moderation-panel__subtitle">
              Examinez chaque annonce, contrôlez l’auteur et prenez une décision rapide.
            </p>
          </div>
          <span className="admin-users-panel__count">{items.length} annonces</span>
        </div>

        {loading ? (
          <div className="admin-empty"><Loader2 className="profil-spin" /></div>
        ) : items.length === 0 ? (
          <div className="admin-empty">Aucune annonce à modérer</div>
        ) : (
          <table className="admin-table admin-table--moderation">
            <thead>
              <tr>
                <th>Médicament</th>
                <th>Type</th>
                <th>Auteur</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(a => (
                <tr key={a.id}>
                  <td data-label="Médicament">
                    <span className="admin-moderation-medicine">{a.marque || a.dci || '—'}</span>
                  </td>
                  <td data-label="Type">
                    <span className={`admin-moderation-type admin-moderation-type--${String(a.type || '').toLowerCase() === 'demande' ? 'demande' : 'offre'}`}>
                      {String(a.type || '').toLowerCase() === 'demande' ? 'Demande' : 'Offre'}
                    </span>
                  </td>
                  <td data-label="Auteur">
                    <span className="admin-moderation-author">
                      {a.user_prenom && a.user_nom ? `${a.user_prenom} ${a.user_nom}` : '—'}
                    </span>
                  </td>
                  <td data-label="Date">
                    <span className="admin-moderation-date">
                      {a.created_at ? new Date(a.created_at).toLocaleDateString('fr-FR') : '—'}
                    </span>
                  </td>
                  <td data-label="Actions">
                    <div className="admin-actions admin-moderation-actions">
                      <button
                        className="admin-btn admin-btn--approve admin-moderation-btn admin-moderation-btn--approve"
                        disabled={busyId === a.id}
                        onClick={() => moderate(a.id, 'approve')}
                      >
                        <Check size={14} /> Approuver
                      </button>
                      <button
                        className="admin-btn admin-btn--reject admin-moderation-btn admin-moderation-btn--reject"
                        disabled={busyId === a.id}
                        onClick={() => moderate(a.id, 'reject')}
                      >
                        <X size={14} /> Rejeter
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
