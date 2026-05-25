import { useEffect, useState } from 'react';
import { Users, FileText, Activity, CheckCircle2, Loader2, Mail, Phone, ShieldCheck, Ban, Trash2, RefreshCw } from 'lucide-react';
import { adminApi } from '../../services/api';
import './AdminLayout.css';

const KPIS = [
  { key: 'totalUsers', label: 'Utilisateurs', icon: Users },
  { key: 'totalAnnonces', label: 'Annonces', icon: FileText },
  { key: 'publishedAnnonces', label: 'Publiées', icon: Activity },
  { key: 'pendingAnnonces', label: 'En attente', icon: CheckCircle2 },
];

const ROLE_LABELS = {
  ADMIN: { label: 'Admin', className: 'admin-role-badge--admin' },
  USER: { label: 'Utilisateur', className: 'admin-role-badge--user' },
  PHARMACY: { label: 'Pharmacie', className: 'admin-role-badge--pharmacy' },
};

export default function StatsPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, usersRes] = await Promise.all([
          adminApi.stats(),
          adminApi.users(),
        ]);
        setStats(statsRes?.stats || statsRes || {});
        setUsers(usersRes?.users || []);
      } catch (err) {
        setError(err?.response?.data?.message || 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSuspend = async (id, suspend) => {
    if (!window.confirm(`Voulez-vous vraiment ${suspend ? 'suspendre' : 'réactiver'} cet utilisateur ?`)) return;
    try {
      const res = await adminApi.suspendUser(id, suspend);
      setUsers(users.map(u => u.id === id ? { ...u, is_suspended: suspend } : u));
    } catch (err) {
      alert(err?.response?.data?.message || 'Erreur lors de l\'opération');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Voulez-vous VRAIMENT supprimer cet utilisateur ? Cette action est irréversible et supprimera toutes ses annonces.')) return;
    try {
      await adminApi.deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
      setStats(prev => ({ ...prev, totalUsers: (prev.totalUsers || 1) - 1 }));
    } catch (err) {
      alert(err?.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const val = (k) => stats?.[k] ?? stats?.counts?.[k] ?? 0;

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  return (
    <div>
      <h1 className="admin-page-title">Statistiques</h1>
      <p className="admin-page-sub">Vue d'ensemble de la plateforme</p>

      {loading ? (
        <div className="admin-empty"><Loader2 className="profil-spin" /></div>
      ) : error ? (
        <div className="admin-empty">{error}</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="admin-kpi-grid">
            {KPIS.map(({ key, label, icon: Icon }) => (
              <div key={key} className="admin-kpi glass-bright">
                <div className="admin-kpi__head">
                  <Icon size={16} />
                  <span className="admin-kpi__label">{label}</span>
                </div>
                <span className="admin-kpi__value">{val(key)}</span>
              </div>
            ))}
          </div>

          {/* Users List */}
          <div className="admin-card glass-bright admin-users-panel" style={{ marginTop: '1.5rem' }}>
            <div className="admin-users-panel__head">
              <div>
                <h3 className="admin-users-panel__title">
                  <Users size={18} />
                  Liste des utilisateurs
                </h3>
                <p className="admin-users-panel__subtitle">
                  Consultez l’état des comptes, les coordonnées et les actions d’administration en un seul endroit.
                </p>
              </div>
              <span className="admin-users-panel__count">{users.length} comptes</span>
            </div>

            {users.length === 0 ? (
              <div className="admin-empty">Aucun utilisateur trouvé</div>
            ) : (
              <div className="admin-users-list">
                <div className="admin-users-list__body">
                  {users.map((u, i) => {
                    const role = ROLE_LABELS[u.role] || ROLE_LABELS.USER;
                    const isSuspended = !!u.is_suspended;
                    const verifiedLabel = u.is_verified ? 'Vérifié' : 'Non vérifié';

                    return (
                      <div key={u.id} className={`admin-user-card glass ${isSuspended ? 'is-suspended' : ''}`}>
                        <div className="admin-user-card__top">
                          <div className="admin-user-card__index">{i + 1}</div>

                          <div className="admin-user-card__identity">
                            <div className="admin-user-card__name-row">
                              <strong className="admin-user-card__name">{u.prenom} {u.nom}</strong>
                              {isSuspended && <span className="admin-user-chip admin-user-chip--suspended">Suspendu</span>}
                            </div>
                            <div className="admin-user-card__subtext">Compte créé le {formatDate(u.created_at)}</div>
                          </div>

                          <div className="admin-user-card__actions">
                            <button
                              className={`admin-user-action-btn ${isSuspended ? 'admin-user-action-btn--restore' : 'admin-user-action-btn--warn'}`}
                              onClick={() => handleSuspend(u.id, !isSuspended)}
                              title={isSuspended ? 'Réactiver le compte' : 'Suspendre le compte'}
                              aria-label={isSuspended ? 'Réactiver le compte' : 'Suspendre le compte'}
                            >
                              {isSuspended ? <RefreshCw size={16} /> : <Ban size={16} />}
                              <span>{isSuspended ? 'Réactiver' : 'Suspendre'}</span>
                            </button>

                            <button
                              className="admin-user-action-btn admin-user-action-btn--danger"
                              onClick={() => handleDelete(u.id)}
                              title="Supprimer le compte"
                              aria-label="Supprimer le compte"
                            >
                              <Trash2 size={16} />
                              <span>Supprimer</span>
                            </button>
                          </div>
                        </div>

                        <div className="admin-user-card__meta">
                          <div className="admin-user-card__meta-item">
                            <span className="admin-user-card__label">Email</span>
                            <span className="admin-user-card__value">
                              <Mail size={13} />
                              {u.email}
                            </span>
                          </div>

                          <div className="admin-user-card__meta-item">
                            <span className="admin-user-card__label">Téléphone</span>
                            <span className="admin-user-card__value">
                              {u.phone ? (
                                <>
                                  <Phone size={13} />
                                  {u.phone}
                                </>
                              ) : (
                                '—'
                              )}
                            </span>
                          </div>

                          <div className="admin-user-card__meta-item">
                            <span className="admin-user-card__label">Rôle</span>
                            <span className={`admin-role-badge ${role.className}`}>
                              {u.role === 'ADMIN' && <ShieldCheck size={12} />}
                              {role.label}
                            </span>
                          </div>

                          <div className="admin-user-card__meta-item">
                            <span className="admin-user-card__label">Vérification</span>
                            <span className={`admin-user-status ${u.is_verified ? 'is-verified' : 'is-unverified'}`} title={verifiedLabel}>
                              <span className="admin-user-status__dot" />
                              {verifiedLabel}
                            </span>
                          </div>

                          <div className="admin-user-card__meta-item">
                            <span className="admin-user-card__label">Annonces</span>
                            <span className={`admin-user-count ${u.annonce_count > 0 ? 'has-data' : ''}`}>
                              {u.annonce_count}
                            </span>
                          </div>

                          <div className="admin-user-card__meta-item">
                            <span className="admin-user-card__label">Inscrit</span>
                            <span className="admin-user-card__value admin-user-card__value--date">
                              {formatDate(u.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
