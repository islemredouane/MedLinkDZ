import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, CheckCircle2, Loader2, Phone, Shield, User } from 'lucide-react';
import PremiumButton from '../components/ui/PremiumButton';
import Input from '../components/ui/Input';
import WilayaSelect from '../components/ui/WilayaSelect';
import { useAuth } from '../context/AuthContext';
import { assetUrl } from '../services/api';
import './EditProfilePage.css';

export default function EditProfilePage() {
  const { user, loading: authLoading, updateProfile } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [form, setForm] = useState({ nom: '', prenom: '', phone: '', wilaya: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    setForm({
      nom: user.nom || '',
      prenom: user.prenom || '',
      phone: user.phone || '',
      wilaya: user.wilaya || '',
    });
  }, [user]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const avatarSrc = useMemo(() => avatarPreview || assetUrl(user?.avatar_url), [avatarPreview, user?.avatar_url]);
  const roleLabel = user?.role === 'ADMIN' ? 'Administrateur' : 'Utilisateur';
  const isVerified = !!user?.is_verified;

  const onPickAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => fd.append(key, value ?? ''));
      if (avatarFile) fd.append('avatar', avatarFile);
      await updateProfile(fd);
      navigate('/profil', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Impossible d\'enregistrer les modifications.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="edit-profile-page">
        <div className="container edit-profile-page__loading">
          <Loader2 size={28} className="profil-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="edit-profile-page">
      <div className="edit-profile-glow" />
      <div className="container edit-profile-shell">
        <div className="edit-profile-hero glass-bright">
          <button className="edit-profile-back" onClick={() => navigate('/profil')} type="button">
            <ArrowLeft size={16} />
            <span>Retour</span>
          </button>

          <div className="edit-profile-hero__copy">
            <span className="edit-profile-kicker">Profil personnel</span>
            <h1>Modifier mes informations</h1>
            <p>
              Une page dédiée pour éditer vos coordonnées, votre photo de profil et votre localisation sans conflit avec la navigation.
            </p>
          </div>

          <div className="edit-profile-hero__actions">
            <PremiumButton variant="ghost" size="sm" onClick={() => navigate('/profil')}>
              Annuler
            </PremiumButton>
            <PremiumButton variant="primary" size="sm" loading={saving} type="submit" form="edit-profile-form">
              Enregistrer
            </PremiumButton>
          </div>
        </div>

        <div className="edit-profile-grid">
          <form id="edit-profile-form" className="edit-profile-card glass-bright" onSubmit={handleSave}>
            <div className="edit-profile-section">
              <div className="edit-profile-section__head">
                <h2>Photo de profil</h2>
                <p>Ajoutez une image claire pour rendre votre compte plus identifiable.</p>
              </div>

              <div className="edit-profile-avatar-row">
                <div className="edit-profile-avatar">
                  {avatarSrc ? <img src={avatarSrc} alt="avatar" /> : <User size={42} />}
                </div>
                <div className="edit-profile-avatar-copy">
                  <strong>{user.prenom} {user.nom}</strong>
                  <span>{user.email}</span>
                  <button type="button" className="edit-profile-avatar-btn" onClick={() => fileRef.current?.click()}>
                    <Camera size={14} />
                    Changer la photo
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickAvatar} />
                </div>
              </div>
            </div>

            <div className="edit-profile-section">
              <div className="edit-profile-section__head">
                <h2>Identité</h2>
                <p>Gardez vos informations principales à jour pour un profil plus cohérent.</p>
              </div>

              <div className="edit-profile-form-grid">
                <Input
                  label="Prénom"
                  id="edit-prenom"
                  icon={User}
                  value={form.prenom}
                  onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                />
                <Input
                  label="Nom"
                  id="edit-nom"
                  icon={User}
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                />
              </div>
            </div>

            <div className="edit-profile-section">
              <div className="edit-profile-section__head">
                <h2>Coordonnées</h2>
                <p>Ces données sont utilisées pour vous contacter plus facilement.</p>
              </div>

              <div className="edit-profile-form-stack">
                <Input
                  label="Téléphone"
                  id="edit-phone"
                  icon={Phone}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <WilayaSelect
                  label="Wilaya"
                  value={form.wilaya}
                  onChange={(value) => setForm({ ...form, wilaya: value })}
                />
              </div>
            </div>

            {error && <div className="edit-profile-error">{error}</div>}

            <div className="edit-profile-footer">
              <PremiumButton variant="ghost" onClick={() => navigate('/profil')}>
                Annuler
              </PremiumButton>
              <PremiumButton variant="primary" loading={saving} type="submit">
                Enregistrer les modifications
              </PremiumButton>
            </div>
          </form>

          <aside className="edit-profile-aside">
            <div className="edit-profile-summary glass-bright">
              <div className="edit-profile-summary__badge">
                <CheckCircle2 size={14} />
                Page dédiée
              </div>
              <div className="edit-profile-summary__avatar">
                {avatarSrc ? <img src={avatarSrc} alt="avatar" /> : <User size={34} />}
              </div>
              <div className="edit-profile-summary__name">{user.prenom} {user.nom}</div>
              <div className="edit-profile-summary__email">{user.email}</div>
              <div className="edit-profile-summary__chips">
                <span className="edit-profile-chip"><Shield size={12} /> {roleLabel}</span>
                <span className={`edit-profile-chip ${isVerified ? 'is-verified' : 'is-pending'}`}>
                  {isVerified ? 'Compte vérifié' : 'Compte à vérifier'}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
