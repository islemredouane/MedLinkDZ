import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, MapPin, Calendar, Package, LogOut,
  Edit3, Shield, Loader2,
} from 'lucide-react';
import PremiumButton from '../components/ui/PremiumButton';
import FadeUp from '../components/animations/FadeUp';
import { useAuth } from '../context/AuthContext';
import { annonceApi, assetUrl } from '../services/api';
import './ProfilPage.css';

export default function ProfilPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [annonces, setAnnonces] = useState([]);
  const [loadingAnnonces, setLoadingAnnonces] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!user) return;
    (async () => {
      try {
        const data = await annonceApi.myAnnonces();
        if (mounted) setAnnonces(Array.isArray(data) ? data : data?.annonces || []);
      } catch {
        if (mounted) setAnnonces([]);
      } finally {
        if (mounted) setLoadingAnnonces(false);
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  const stats = useMemo(() => {
    const active = annonces.filter(a => (a.status || a.statut) === 'active' || (a.status || a.statut) === 'ACTIVE').length;
    const closed = annonces.length - active;
    return [
      { label: 'Annonces', value: annonces.length, icon: Package },
      { label: 'Actives', value: active, icon: Shield },
      { label: 'Terminées', value: closed, icon: Package },
    ];
  }, [annonces]);

  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '—';

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  if (authLoading || !user) {
    return (
      <div className="profil-page">
        <div className="container" style={{ padding: '4rem 0', display: 'flex', justifyContent: 'center' }}>
          <Loader2 size={28} className="profil-spin" />
        </div>
      </div>
    );
  }


  const avatarSrc = assetUrl(user.avatar_url); // DB column is 'avatar_url'
  const isVerified = !!user.is_verified;
  const roleLabel = user.role === 'ADMIN' ? 'Administrateur' : 'Utilisateur';

  const goToProfileEdit = () => navigate('/profil/modifier');


  return (
    <div className="profil-page">
      <div className="profil-glow" />
      <div className="container">
        <FadeUp>
          <div className="profil-hero glass-bright">
            <div className="profil-hero__left">
              <div className="profil-avatar">
                {avatarSrc ? <img src={avatarSrc} alt="avatar" /> : <User size={36} />}
              </div>
              <div className="profil-info">
                <h1 className="profil-name">{user.prenom} {user.nom}</h1>
                <div className="profil-meta">
                  {user.wilaya && <span><MapPin size={13} /> {user.wilaya}</span>}
                  <span><Calendar size={13} /> Membre depuis {joinDate}</span>
                </div>
                <div className="profil-chips">
                  <span className="profil-chip profil-chip--role">
                    <Shield size={12} /> {roleLabel}
                  </span>
                  <span className={`profil-chip ${isVerified ? 'profil-chip--verified' : 'profil-chip--pending'}`}>
                    {isVerified ? 'Compte vérifié' : 'Compte à vérifier'}
                  </span>
                </div>
              </div>
            </div>
            <div className="profil-hero__right">
              <PremiumButton variant="primary" icon={Edit3} size="sm" onClick={goToProfileEdit}>
                Modifier le profil
              </PremiumButton>
              {user.role === 'ADMIN' && (
                <PremiumButton variant="ghost" icon={Shield} size="sm" onClick={() => navigate('/admin')}>
                  Admin
                </PremiumButton>
              )}
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.1}>
          <div className="profil-stats">
            {stats.map((s, i) => {
              const StatIcon = s.icon;
              return (
                <div key={i} className="profil-stat glass glow-border">
                  <div className="profil-stat__icon"><StatIcon size={18} /></div>
                  <span className="profil-stat__value">{s.value}</span>
                  <span className="profil-stat__label">{s.label}</span>
                </div>
              );
            })}
          </div>
        </FadeUp>

        <div className="profil-grid">
          <FadeUp delay={0.15}>
            <div className="profil-info-card glass-bright">
              <div className="profil-card-head">
                <h3 className="profil-card-title">Informations personnelles</h3>
                <p className="profil-card-subtitle">Vos coordonnées visibles et modifiables en un seul endroit.</p>
              </div>
              <div className="profil-info-rows">
                <div className="profil-info-row">
                  <Mail size={16} />
                  <div>
                    <span className="profil-info-row__label">Email</span>
                    <span className="profil-info-row__value">{user.email}</span>
                  </div>
                </div>
                {user.phone && (
                  <div className="profil-info-row">
                    <Phone size={16} />
                    <div>
                      <span className="profil-info-row__label">Téléphone</span>
                      <span className="profil-info-row__value">{user.phone}</span>
                    </div>
                  </div>
                )}
                {user.wilaya && (
                  <div className="profil-info-row">
                    <MapPin size={16} />
                    <div>
                      <span className="profil-info-row__label">Wilaya</span>
                      <span className="profil-info-row__value">{user.wilaya}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="profil-info-card__actions">
                <PremiumButton variant="ghost" icon={Edit3} size="sm" onClick={goToProfileEdit}>
                  Modifier les informations
                </PremiumButton>
              </div>

              <button className="logout-btn" onClick={handleLogout}>
                <LogOut size={16} />
                Se déconnecter
              </button>
            </div>
          </FadeUp>

          <FadeUp delay={0.2}>
            <div className="profil-annonces-card glass-bright">
              <div className="profil-card-head profil-card-head--space-between">
                <div>
                  <h3 className="profil-card-title">Mes annonces</h3>
                  <p className="profil-card-subtitle">Ouvrez l’espace dédié pour voir tout l’historique des annonces.</p>
                </div>
                <span className="profil-count-pill">{annonces.length}</span>
              </div>

              <div className="profil-annonces-preview">
                <div className="profil-annonces-preview__icon">
                  <Package size={20} />
                </div>
                <div className="profil-annonces-preview__content">
                  <strong>{annonces.length} annonce{annonces.length > 1 ? 's' : ''}</strong>
                  <span>Accédez au tableau de suivi complet dans une page dédiée.</span>
                </div>
              </div>

              <div className="profil-annonces-card__actions">
                <PremiumButton variant="primary" icon={Package} size="sm" onClick={() => navigate('/profil/annonces')}>
                  Ouvrir mes annonces
                </PremiumButton>
              </div>
            </div>
          </FadeUp>
        </div>
      </div>

    </div>
  );
}
