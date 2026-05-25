import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HeartPulse, Loader2, ArrowRight } from 'lucide-react';
import AuthNotice from '../components/ui/AuthNotice';
import PremiumButton from '../components/ui/PremiumButton';
import MagnetButton from '../components/animations/MagnetButton';
import { authApi } from '../services/api';
import './AuthPages.css';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Token de vérification manquant ou expiré.');
      setLoading(false);
      return;
    }

    authApi.verifyEmail(token)
      .then((res) => {
        setMessage(res.message || 'Email vérifié avec succès.');
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Le lien de vérification a expiré ou est invalide.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [searchParams]);

  // Dynamically adapt titles based on verification status (UX best practice)
  let pageTitle = "Vérification de l'email";
  let pageSubtitle = "Nous validons votre compte maintenant.";

  if (!loading) {
    if (message) {
      pageTitle = "Compte Activé ! 🎉";
      pageSubtitle = "Votre compte est désormais actif et prêt à l'emploi. Rejoignez notre communauté !";
    } else if (error) {
      pageTitle = "Échec de validation ⚠️";
      pageSubtitle = "Nous n'avons pas pu valider votre adresse email. Essayez de renvoyer le lien.";
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-glow-top" />

      <div className="container auth-container">
        <motion.div
          className="auth-card glass-bright"
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="auth-logo">
            <div className="auth-logo__icon">
              <HeartPulse size={22} />
            </div>
            <span className="auth-logo__text">MedLink <strong>DZ</strong></span>
          </div>

          <div className="auth-header">
            <h1 className="auth-title">{pageTitle}</h1>
            <p className="auth-subtitle">{pageSubtitle}</p>
          </div>

          <div className="auth-form" style={{ minHeight: '160px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 0', gap: '1.25rem' }}>
                <Loader2 className="prem-btn__spinner" style={{ color: '#10b981', width: '42px', height: '42px' }} />
                <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Validation de vos clés d'accès en cours...</p>
              </div>
            )}

            {!loading && message && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <AuthNotice variant="success" title="Email vérifié" message={message} />
                
                <MagnetButton padding={50} className="w-full">
                  <PremiumButton 
                    variant="primary" 
                    fullWidth 
                    size="lg" 
                    iconRight={ArrowRight}
                    onClick={() => navigate('/login')}
                  >
                    Se connecter à mon compte
                  </PremiumButton>
                </MagnetButton>
              </div>
            )}

            {!loading && error && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                <AuthNotice variant="error" title="Vérification impossible" message={error} />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <MagnetButton padding={50} className="w-full">
                    <PremiumButton 
                      variant="primary" 
                      fullWidth 
                      size="lg" 
                      onClick={() => navigate('/resend-verification')}
                    >
                      Renvoyer l'email de vérification
                    </PremiumButton>
                  </MagnetButton>
                  
                  <PremiumButton 
                    variant="ghost" 
                    fullWidth 
                    size="md" 
                    onClick={() => navigate('/login')}
                  >
                    Retourner à la connexion
                  </PremiumButton>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

