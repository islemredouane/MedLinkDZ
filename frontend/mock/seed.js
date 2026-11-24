/* Demo data (portfolio mode and `npm run dev:mock`). Everything here is fictional.
   Phone numbers use the non-dialable format 00 00 00 00 NN so no real person can be called. */
import { WILAYAS } from '../src/js/data/wilayas.js';

const HOUR = 3600e3;
const now = Date.now();
const ago = (hours) => new Date(now - hours * HOUR).toISOString();
const wName = (id) => WILAYAS.find((w) => w.id === String(id))?.name || '';

export const CATEGORIES = ['Antalgiques', 'Antibiotiques', 'Cardiovasculaire', 'Diabète', 'Pneumologie', 'Endocrinologie', 'Dermatologie', 'Pédiatrie', 'Neurologie', 'Gastro-entérologie']
  .map((nom, i) => ({ id: i + 1, nom }));

/* Demo accounts: password demo1234 (any password is accepted). */
export const USERS = [
  { id: 1, prenom: 'Amina', nom: 'Benali', email: 'admin@medlink.test', phone: '00 00 00 00 01', wilaya_id: 6, wilaya: wName(6), role: 'ADMIN', is_verified: true, is_suspended: false, created_at: ago(24 * 240), avatar_url: '/uploads/avatar-1.svg' },
  { id: 2, prenom: 'Karim', nom: 'Haddad', email: 'membre@medlink.test', phone: '00 00 00 00 02', wilaya_id: 16, wilaya: wName(16), role: 'USER', is_verified: true, is_suspended: false, created_at: ago(24 * 120), avatar_url: null },
  { id: 3, prenom: 'Sara', nom: 'Mansouri', email: 'sara@medlink.test', phone: '00 00 00 00 03', wilaya_id: 31, wilaya: wName(31), role: 'USER', is_verified: true, is_suspended: false, created_at: ago(24 * 90), avatar_url: null },
  { id: 4, prenom: 'Yacine', nom: 'Ouali', email: 'yacine@medlink.test', phone: '00 00 00 00 04', wilaya_id: 25, wilaya: wName(25), role: 'USER', is_verified: true, is_suspended: false, created_at: ago(24 * 60), avatar_url: null },
  { id: 5, prenom: 'Lina', nom: 'Cherif', email: 'lina@medlink.test', phone: '00 00 00 00 05', wilaya_id: 19, wilaya: wName(19), role: 'USER', is_verified: true, is_suspended: false, created_at: ago(24 * 45), avatar_url: null },
  { id: 6, prenom: 'Pharmacie', nom: 'El Amel', email: 'elamel@medlink.test', phone: '00 00 00 00 06', wilaya_id: 6, wilaya: wName(6), role: 'PHARMACY', is_verified: true, is_suspended: false, created_at: ago(24 * 200), avatar_url: null },
  { id: 7, prenom: 'Mehdi', nom: 'Saadi', email: 'nonverifie@medlink.test', phone: '00 00 00 00 07', wilaya_id: 9, wilaya: wName(9), role: 'USER', is_verified: false, is_suspended: false, created_at: ago(30), avatar_url: null },
  { id: 8, prenom: 'Rania', nom: 'Belkacem', email: 'suspendu@medlink.test', phone: '00 00 00 00 08', wilaya_id: 15, wilaya: wName(15), role: 'USER', is_verified: true, is_suspended: true, created_at: ago(24 * 30), avatar_url: null },
  { id: 9, prenom: 'Nassim', nom: 'Ferhat', email: 'nassim@medlink.test', phone: '00 00 00 00 09', wilaya_id: 23, wilaya: wName(23), role: 'USER', is_verified: true, is_suspended: false, created_at: ago(24 * 15), avatar_url: null },
  { id: 10, prenom: 'Imene', nom: 'Djebbar', email: 'imene@medlink.test', phone: '00 00 00 00 10', wilaya_id: 13, wilaya: wName(13), role: 'USER', is_verified: false, is_suspended: false, created_at: ago(12), avatar_url: null },
];

// [type, dci, category, wilaya, qty, hoursAgo, statut, userId, hasPhoto, description]
const RAW = [
  ['DON', 'Doliprane 1000 mg', 'Antalgiques', 16, 3, 0.4, 'PUBLIEE', 2, true, 'Trois boîtes non entamées, achetées en trop. Péremption : mars 2027.'],
  ['DEMANDE', 'Insuline NovoMix 30', 'Diabète', 6, 2, 1.5, 'PUBLIEE', 3, false, 'Rupture dans les pharmacies de mon quartier. Je cherche deux stylos pour ma mère, ordonnance disponible.'],
  ['DON', 'Ventoline 100 µg', 'Pneumologie', 31, 1, 3, 'PUBLIEE', 3, true, 'Inhalateur neuf, jamais utilisé. Mon fils a changé de traitement.'],
  ['DEMANDE', 'Levothyrox 50 µg', 'Endocrinologie', 25, 1, 5, 'PUBLIEE', 4, false, 'Je cherche une boîte en attendant le réapprovisionnement de ma pharmacie.'],
  ['DON', 'Amoxicilline 500 mg', 'Antibiotiques', 19, 2, 8, 'PUBLIEE', 5, true, 'Deux boîtes scellées. Rappel : un antibiotique ne se prend que sur ordonnance.'],
  ['DON', 'Augmentin 1 g', 'Antibiotiques', 15, 1, 11, 'PUBLIEE', 9, false, 'Boîte complète, emballage intact.'],
  ['DEMANDE', 'Glucophage 850 mg', 'Diabète', 9, 3, 14, 'PUBLIEE', 2, false, 'Traitement de longue durée, je cherche trois boîtes.'],
  ['DON', 'Kardégic 75 mg', 'Cardiovasculaire', 23, 2, 20, 'PUBLIEE', 9, true, 'Traitement arrêté sur avis du cardiologue, deux boîtes restantes.'],
  ['DON', 'Smecta', 'Gastro-entérologie', 6, 1, 26, 'PUBLIEE', 6, true, 'Proposé par la pharmacie El Amel : sachets en surplus, à récupérer au comptoir.'],
  ['DEMANDE', 'Ritaline 10 mg', 'Neurologie', 16, 1, 30, 'PUBLIEE', 5, false, 'Ordonnance sécurisée disponible. Merci de me contacter.'],
  ['DON', 'Dexeryl crème', 'Dermatologie', 13, 2, 36, 'PUBLIEE', 4, true, 'Deux tubes neufs de 250 g.'],
  ['DON', 'Efferalgan pédiatrique', 'Pédiatrie', 31, 1, 44, 'PUBLIEE', 3, false, 'Flacon fermé avec pipette doseuse.'],
  ['DEMANDE', 'Lantus SoloStar', 'Diabète', 25, 2, 52, 'PUBLIEE', 9, false, 'Urgent : il ne me reste que trois jours de traitement.'],
  ['DON', 'Tahor 20 mg', 'Cardiovasculaire', 16, 1, 60, 'PUBLIEE', 2, true, 'Une boîte de 30 comprimés, péremption 2027.'],
  ['DON', 'Spasfon', 'Gastro-entérologie', 19, 2, 72, 'PUBLIEE', 5, false, ''],
  ['DEMANDE', 'Seretide Diskus', 'Pneumologie', 6, 1, 90, 'PUBLIEE', 1, false, 'Pour un patient asthmatique sévère, rupture locale.'],
  ['DON', 'Voltarène gel', 'Antalgiques', 23, 1, 110, 'PUBLIEE', 9, true, 'Tube neuf.'],
  ['DON', 'Clamoxyl sirop', 'Pédiatrie', 13, 1, 130, 'PUBLIEE', 4, false, 'Flacon non reconstitué.'],
  // Waiting for moderation
  ['DON', 'Lovenox 4000 UI', 'Cardiovasculaire', 16, 5, 2, 'EN_ATTENTE', 2, true, 'Cinq seringues restantes après une hospitalisation.'],
  ['DEMANDE', 'Humalog KwikPen', 'Diabète', 31, 1, 4, 'EN_ATTENTE', 3, false, 'Je cherche un stylo, ordonnance à jour.'],
  ['DON', 'Inexium 40 mg', 'Gastro-entérologie', 6, 2, 9, 'EN_ATTENTE', 1, false, 'Deux boîtes, péremption fin 2026.'],
  ['DEMANDE', 'Keppra 500 mg', 'Neurologie', 25, 2, 18, 'EN_ATTENTE', 4, false, 'Traitement antiépileptique, rupture à Constantine.'],
  // Rejected / closed
  ['DON', 'Tramadol 50 mg', 'Antalgiques', 16, 1, 100, 'REJETEE', 2, false, 'Boîte entamée.'],
  ['DON', 'Aspégic 1000', 'Antalgiques', 6, 2, 300, 'CLOTUREE', 1, false, 'Échange effectué, merci !'],
];

const COLORS = ['#13805C', '#D4512F', '#2F5DA8', '#7A4BB3', '#C27C0E', '#0E7C86', '#B83A6B'];

export function buildAnnonces() {
  return RAW.map(([type, dci, cat, wid, quantite, h, statut, userId, photo, description], i) => {
    const u = USERS.find((x) => x.id === userId);
    const id = i + 1;
    return {
      id, type, dci, marque: dci, categorie_nom: cat, wilaya_id: wid, wilaya_nom: wName(wid), quantite,
      created_at: ago(h), statut, user_id: userId, description,
      user_prenom: u.prenom, user_nom: u.nom, user_phone: u.phone, user_joined: u.created_at,
      image_url: photo ? `/uploads/box-${id}.svg` : null,
      medias: photo ? [{ url: `/uploads/box-${id}.svg` }] : [],
    };
  });
}

/** A simple illustrated medicine box, used as the annonce "photo". */
export function boxSvg(name, seed) {
  const c = COLORS[seed % COLORS.length];
  const [title, ...rest] = name.split(' ');
  const sub = rest.join(' ');
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F1F5F3"/><stop offset="1" stop-color="#DFE6E3"/></linearGradient>
    <linearGradient id="side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E4EAE7"/><stop offset="1" stop-color="#C9D2CE"/></linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#bg)"/>
  <ellipse cx="400" cy="420" rx="250" ry="22" fill="#000" opacity=".10"/>
  <path d="M560 140 L620 110 L620 380 L560 410 Z" fill="url(#side)"/>
  <path d="M180 140 L240 110 L620 110 L560 140 Z" fill="#F7FAF9"/>
  <rect x="180" y="140" width="380" height="270" rx="6" fill="#FFFFFF"/>
  <rect x="180" y="140" width="380" height="64" fill="${c}"/>
  <rect x="180" y="340" width="380" height="10" fill="${c}" opacity=".25"/>
  <text x="206" y="182" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#fff" letter-spacing="3">MEDLINK · DÉMO</text>
  <text x="206" y="262" font-family="Arial, sans-serif" font-size="46" font-weight="700" fill="#13201B">${esc(title)}</text>
  <text x="206" y="306" font-family="Arial, sans-serif" font-size="28" fill="#46534D">${esc(sub)}</text>
  <circle cx="512" cy="382" r="16" fill="${c}"/><rect x="505" y="372" width="14" height="20" rx="2" fill="#fff"/><rect x="502" y="379" width="20" height="6" rx="2" fill="#fff"/>
</svg>`;
}

export function avatarSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="#86D6B3"/>
  <circle cx="60" cy="48" r="22" fill="#0E3A2C"/><path d="M18 120c4-26 22-40 42-40s38 14 42 40z" fill="#0E3A2C"/></svg>`;
}
