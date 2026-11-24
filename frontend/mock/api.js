/* Demo backend: answers every /api/* route the front-end uses, from fictional data.
   Runs in the browser (portfolio build and `npm run dev:mock`), so the live demo needs no server.
   Same rules as the real API (expiry date, prescriptions, privacy, moderation), so the demo behaves like the product.

   createMockApi({ load, save, prepareImage }) → { handle(Request): Promise<Response>, reset() }
     load()/save(state): persistence (localStorage in the browser) — every page of this multi-page site reloads the JS
     prepareImage(file): optional, shrinks an uploaded photo to a small data URL before it is stored */
import { CATEGORIES, USERS, buildAnnonces, boxSvg, avatarSvg } from './seed.js';
import { WILAYAS } from '../src/js/data/wilayas.js';

export const STATE_VERSION = 3; // bump when the seed or state shape changes, so old saved demos are replaced
const LATENCY = 250; // ms, so loading states are visible
const DEMO_RX = new Set(['ritaline 10 mg', 'humalog kwikpen', 'lantus solostar']);

const svgUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const todayISO = () => new Date().toISOString().slice(0, 10);
const wilayaFields = (id) => {
  const w = WILAYAS.find((x) => x.id === String(id));
  return w ? { wilaya_id: Number(w.id), wilaya: w.name } : { wilaya_id: null, wilaya: null };
};
const publicOrdonnance = (o) => o && { id: o.id, statut: o.statut, admin_comment: o.admin_comment, created_at: o.created_at };
const publicUser = (u) => ({ ...u });

/* Prescriptions are never kept, not even in the visitor's browser: only a placeholder with the file name. */
function prescriptionSvg(label) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800"><rect width="600" height="800" fill="#fff"/>
  <rect x="40" y="40" width="520" height="90" fill="#E2F1E9"/><text x="60" y="95" font-family="Arial" font-size="28" font-weight="700" fill="#0E3A2C">ORDONNANCE (DÉMO)</text>
  <text x="60" y="190" font-family="Arial" font-size="20" fill="#13201B">Dr. Exemple · Médecine générale</text>
  <text x="60" y="260" font-family="Arial" font-size="22" fill="#13201B">${esc(label)}</text>
  <text x="60" y="300" font-family="Arial" font-size="16" fill="#46534D">Document fictif : en mode démo, le fichier envoyé n'est pas conservé.</text>
  <text x="60" y="740" font-family="Arial" font-size="14" fill="#77837E">MedLink DZ · projet de démonstration</text></svg>`;
}

export function createState() {
  const annonces = buildAnnonces();
  const medicaments = [];
  for (const a of annonces) {
    let med = medicaments.find((x) => x.marque.toLowerCase() === a.dci.toLowerCase());
    if (!med) {
      med = { id: medicaments.length + 1, dci: a.dci, marque: a.dci, categorie_id: CATEGORIES.find((c) => c.nom === a.categorie_nom)?.id ?? null, prescription_required: DEMO_RX.has(a.dci.toLowerCase()) };
      medicaments.push(med);
    }
    a.medicament_id = med.id;
    a.ordonnance_id = null;
    a.date_peremption = a.type === 'DON' ? `${new Date().getFullYear() + 1}-${String((a.id % 12) + 1).padStart(2, '0')}-01` : null;
  }
  const ordonnances = [];
  const humalog = annonces.find((a) => a.dci === 'Humalog KwikPen');
  if (humalog) {
    ordonnances.push({ id: 1, user_id: humalog.user_id, statut: 'EN_ATTENTE', admin_comment: null, created_at: humalog.created_at, label: 'Humalog KwikPen — 1 stylo' });
    humalog.ordonnance_id = 1;
  }
  return {
    version: STATE_VERSION,
    createdAt: Date.now(),
    users: USERS.map((u) => ({ ...u })),
    annonces,
    medicaments,
    ordonnances,
    uploads: {}, // "/uploads/demo-…" → data URL (photos only, already shrunk)
    nextAnnonce: 1000,
    nextOrdonnance: 2,
    nextUser: 100,
  };
}

/* Replace "/uploads/…" paths in a response with displayable data URLs (seed boxes, avatar, uploaded photos). */
function resolveAssets(value, db) {
  if (typeof value === 'string' && value.startsWith('/uploads/')) {
    const box = value.match(/^\/uploads\/box-(\d+)\.svg$/);
    if (box) return svgUrl(boxSvg(db.annonces.find((x) => x.id === Number(box[1]))?.dci || 'Médicament', Number(box[1])));
    if (value === '/uploads/avatar-1.svg') return svgUrl(avatarSvg());
    return db.uploads[value] || null;
  }
  if (Array.isArray(value)) return value.map((v) => resolveAssets(v, db));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveAssets(v, db)]));
  return value;
}

async function fileToDataUrl(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${file.type || 'application/octet-stream'};base64,${btoa(bin)}`;
}

export function createMockApi({ load = () => null, save = () => {}, prepareImage } = {}) {
  let db = load();
  if (!db || db.version !== STATE_VERSION) { db = createState(); save(db); }

  const json = (status, body) => new Response(JSON.stringify(resolveAssets(body, db)), { status, headers: { 'Content-Type': 'application/json' } });
  const delay = () => new Promise((r) => setTimeout(r, LATENCY));

  async function handle(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const m = request.method.toUpperCase();
    await delay();

    let dirty = false;
    const send = (status, body) => { if (dirty) save(db); return json(status, body); };
    const fail = (status, message) => json(status, { success: false, message });

    const token = (request.headers.get('authorization') || '').replace('Bearer ', '');
    const me = db.users.find((u) => token === `mock-${u.id}`) || null;

    const saveImage = async (file) => {
      const p = `/uploads/demo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      db.uploads[p] = prepareImage ? await prepareImage(file) : await fileToDataUrl(file);
      return p;
    };

    try {
      let body = {};
      if (['POST', 'PUT', 'PATCH'].includes(m)) {
        const type = request.headers.get('content-type') || '';
        if (type.includes('application/json')) body = await request.json().catch(() => ({}));
        else if (type.includes('multipart/form-data')) body = await request.formData();
      }
      const field = (k) => (body instanceof FormData ? body.get(k) : body[k]);
      const isFile = (v) => v && typeof v === 'object' && typeof v.arrayBuffer === 'function';
      let match;

      /* ---------- Demo helpers ---------- */
      if (m === 'POST' && path === '/api/__mock/reset') { db = createState(); save(db); return json(200, { success: true }); }

      /* ---------- Auth ---------- */
      if (m === 'POST' && path === '/api/auth/login') {
        const u = db.users.find((x) => x.email === String(field('email') || '').trim().toLowerCase());
        if (!u) return fail(401, 'Email ou mot de passe incorrect.');
        if (!u.is_verified) return fail(401, 'Email non vérifié. Veuillez vérifier votre boîte mail pour activer votre compte.');
        if (u.is_suspended) return fail(403, 'Votre compte a été suspendu par un administrateur.');
        return send(200, { success: true, token: `mock-${u.id}`, user: publicUser(u) });
      }
      if (m === 'POST' && path === '/api/auth/register') {
        const email = String(field('email') || '').trim().toLowerCase();
        if (db.users.some((x) => x.email === email)) return fail(400, 'Un utilisateur avec cet email existe déjà.');
        db.users.push({ id: db.nextUser++, prenom: field('prenom'), nom: field('nom'), email, phone: field('phone'), ...wilayaFields(field('wilaya')), role: 'USER', is_verified: false, is_suspended: false, created_at: new Date().toISOString(), avatar_url: null });
        dirty = true;
        return send(201, { success: true, message: "Inscription enregistrée dans cette démo (rien n'est envoyé). Aucun email n'est envoyé : ouvrez /verify-email?token=demo pour simuler le lien." });
      }
      if (m === 'POST' && path === '/api/auth/forgot-password') return send(200, { success: true, message: 'Démo : aucun email envoyé. Utilisez le lien /reset-password?token=demo.' });
      if (m === 'POST' && path === '/api/auth/resend-verification') return send(200, { success: true, message: 'Démo : aucun email envoyé. Utilisez le lien /verify-email?token=demo.' });
      if (m === 'POST' && path === '/api/auth/reset-password') return field('token') === 'demo' ? send(200, { success: true }) : fail(400, 'Jeton invalide ou expiré. (Démo : utilisez « demo ».)');
      if (m === 'GET' && path === '/api/auth/verify-email') {
        if (url.searchParams.get('token') !== 'demo') return fail(400, 'Le lien de vérification a expiré ou est invalide.');
        // Verify the most recent demo sign-up so its owner can sign in
        const pending = [...db.users].reverse().find((u) => !u.is_verified && u.id >= 100);
        if (pending) { pending.is_verified = true; dirty = true; }
        return send(200, { success: true, message: 'Email vérifié avec succès.' });
      }
      if (m === 'GET' && path === '/api/auth/me') return me ? send(200, { success: true, user: publicUser(me) }) : fail(401, 'Non authentifié.');
      if (m === 'PATCH' && path === '/api/auth/update-profile') {
        if (!me) return fail(401, 'Non authentifié.');
        for (const k of ['prenom', 'nom', 'phone']) if (field(k)) me[k] = field(k);
        if (field('wilaya')) Object.assign(me, wilayaFields(field('wilaya')));
        const av = field('avatar');
        if (isFile(av)) me.avatar_url = await saveImage(av);
        dirty = true;
        return send(200, { success: true, user: publicUser(me) });
      }

      /* ---------- Annonces ---------- */
      if (m === 'GET' && path === '/api/annonces') {
        const list = db.annonces.filter((a) => a.statut === 'PUBLIEE').sort((a, b) => b.created_at.localeCompare(a.created_at));
        return send(200, { success: true, annonces: list });
      }
      if (m === 'GET' && path === '/api/annonces/user/my-annonces') {
        if (!me) return fail(401, 'Non authentifié.');
        const mine = db.annonces.filter((a) => a.user_id === me.id).sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map((a) => ({ ...a, ordonnance_statut: db.ordonnances.find((o) => o.id === a.ordonnance_id)?.statut ?? null }));
        return send(200, { success: true, annonces: mine });
      }
      if (m === 'POST' && path === '/api/annonces') {
        if (!me) return fail(401, 'Non authentifié.');
        const wid = Number(field('wilaya_id'));
        const type = field('type');
        if (!['DON', 'DEMANDE'].includes(type)) return fail(400, "Type d'annonce invalide.");
        const name = String(field('medicament_name') || '').trim();
        if (!name) return fail(400, 'Le nom du médicament est requis.');
        const catId = field('categorie_id') ? Number(field('categorie_id')) : null;
        if (catId && !CATEGORIES.some((c) => c.id === catId)) return fail(400, 'Catégorie invalide.');
        let expiry = null;
        if (type === 'DON') {
          expiry = String(field('date_peremption') || '');
          if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry)) return fail(400, 'La date de péremption est obligatoire pour une offre.');
          if (expiry < todayISO()) return fail(400, 'Ce médicament est périmé : il ne peut pas être proposé.');
        }
        let med = db.medicaments.find((x) => x.marque.toLowerCase() === name.toLowerCase());
        if (!med) { med = { id: db.medicaments.length + 1, dci: name, marque: name, categorie_id: catId, prescription_required: false }; db.medicaments.push(med); }
        else if (catId && !med.categorie_id) med.categorie_id = catId;
        let ordId = null;
        if (type === 'DEMANDE' && field('ordonnance_id')) {
          ordId = Number(field('ordonnance_id'));
          const o = db.ordonnances.find((x) => x.id === ordId);
          if (!o || o.user_id !== me.id) return fail(400, 'Ordonnance invalide.');
          if (db.annonces.some((x) => x.ordonnance_id === ordId)) return fail(400, 'Cette ordonnance est déjà utilisée par une autre annonce.');
        }
        if (type === 'DEMANDE' && med.prescription_required && !ordId) return fail(400, 'Ce médicament nécessite une ordonnance. Ajoutez-la à votre demande.');
        const img = field('images');
        const imgPath = isFile(img) ? await saveImage(img) : null;
        const a = {
          id: db.nextAnnonce++, type, dci: med.dci, marque: med.marque, medicament_id: med.id, ordonnance_id: ordId, date_peremption: expiry,
          categorie_nom: CATEGORIES.find((c) => c.id === med.categorie_id)?.nom || 'Autre', wilaya_id: wid, wilaya_nom: WILAYAS.find((w) => w.id === String(wid))?.name || '',
          quantite: Number(field('quantite')), description: field('description') || '', created_at: new Date().toISOString(),
          statut: 'EN_ATTENTE', user_id: me.id, user_prenom: me.prenom, user_nom: me.nom, user_phone: me.phone, user_joined: me.created_at,
          image_url: imgPath, medias: imgPath ? [{ url: imgPath }] : [],
        };
        db.annonces.push(a);
        dirty = true;
        return send(201, { success: true, annonce: a });
      }
      if ((match = path.match(/^\/api\/annonces\/(\d+)$/))) {
        const a = db.annonces.find((x) => x.id === Number(match[1]));
        if (m === 'GET') {
          const visible = a && (a.statut === 'PUBLIEE' || (me && (me.id === a.user_id || me.role === 'ADMIN')));
          if (!visible) return fail(404, 'Annonce non trouvée.');
          const { user_phone, ...pub } = a;
          return send(200, { success: true, annonce: me ? a : pub }); // phone only for signed-in members
        }
        if (!me) return fail(401, 'Non authentifié.');
        if (!a) return fail(404, 'Annonce introuvable.');
        if (a.user_id !== me.id && me.role !== 'ADMIN') return fail(403, 'Accès refusé.');
        if (m === 'DELETE') {
          db.annonces = db.annonces.filter((x) => x !== a);
          for (const mm of a.medias || []) delete db.uploads[mm.url];
          dirty = true;
          return send(200, { success: true });
        }
        if (m === 'PUT') {
          for (const k of ['quantite', 'description']) if (field(k) !== undefined) a[k] = field(k);
          dirty = true;
          return send(200, { success: true, annonce: a });
        }
      }

      /* ---------- Prescriptions (private: owner + admins) ---------- */
      if (m === 'POST' && path === '/api/ordonnances/upload') {
        if (!me) return fail(401, 'Non authentifié.');
        const file = field('ordonnance');
        if (!isFile(file)) return fail(400, 'Fichier requis. Veuillez uploader une ordonnance (image ou PDF).');
        const o = { id: db.nextOrdonnance++, user_id: me.id, statut: 'EN_ATTENTE', admin_comment: null, created_at: new Date().toISOString(), label: file.name || 'ordonnance' };
        db.ordonnances.push(o);
        dirty = true;
        return send(201, { success: true, ordonnance: publicOrdonnance(o) });
      }
      if ((match = path.match(/^\/api\/ordonnances\/(\d+)(\/file)?$/)) && m === 'GET') {
        if (!me) return fail(401, 'Non authentifié.');
        const o = db.ordonnances.find((x) => x.id === Number(match[1]));
        if (!o || (o.user_id !== me.id && me.role !== 'ADMIN')) return fail(404, 'Ordonnance non trouvée.');
        if (!match[2]) return send(200, { success: true, ordonnance: publicOrdonnance(o) });
        return new Response(prescriptionSvg(o.label), { status: 200, headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'private, no-store' } });
      }

      /* ---------- Catalog ---------- */
      if (m === 'GET' && path === '/api/catalog/categories') return send(200, { success: true, categories: CATEGORIES });
      if (m === 'GET' && path === '/api/catalog/wilayas') return send(200, { success: true, wilayas: WILAYAS.map((w) => ({ id: Number(w.id), nom_fr: w.name })) });
      if (m === 'GET' && path === '/api/catalog/medicaments') {
        return send(200, { success: true, medicaments: db.medicaments.map((x) => ({ ...x, categorie_nom: CATEGORIES.find((c) => c.id === x.categorie_id)?.nom ?? null })) });
      }
      if (m === 'GET' && path === '/api/catalog/summary') {
        return send(200, { success: true, stats: { activeAnnonces: db.annonces.filter((a) => a.statut === 'PUBLIEE').length, wilayas: 69, medicaments: db.medicaments.length } });
      }

      /* ---------- Admin ---------- */
      if (path.startsWith('/api/admin/')) {
        if (me?.role !== 'ADMIN') return fail(me ? 403 : 401, me ? 'Accès refusé.' : 'Non authentifié.');
        if (m === 'GET' && path === '/api/admin/stats') {
          const count = (s) => db.annonces.filter((a) => a.statut === s).length;
          return send(200, { success: true, stats: { totalUsers: db.users.length, totalAnnonces: db.annonces.length, publishedAnnonces: count('PUBLIEE'), pendingAnnonces: count('EN_ATTENTE'), pendingOrdonnances: db.ordonnances.filter((o) => o.statut === 'EN_ATTENTE').length } });
        }
        if (m === 'GET' && path === '/api/admin/pending') {
          const annonces = db.annonces.filter((a) => a.statut === 'EN_ATTENTE').map((a) => ({
            ...a,
            prescription_required: !!db.medicaments.find((x) => x.id === a.medicament_id)?.prescription_required,
            ordonnance_statut: db.ordonnances.find((o) => o.id === a.ordonnance_id)?.statut ?? null,
          }));
          return send(200, { success: true, annonces, ordonnances: db.ordonnances.filter((o) => o.statut === 'EN_ATTENTE').map(publicOrdonnance) });
        }
        if (m === 'PATCH' && (match = path.match(/^\/api\/admin\/medicaments\/(\d+)$/))) {
          if (typeof field('prescription_required') !== 'boolean') return fail(400, 'Le champ "prescription_required" (booléen) est requis.');
          const med = db.medicaments.find((x) => x.id === Number(match[1]));
          if (!med) return fail(404, 'Médicament non trouvé.');
          med.prescription_required = field('prescription_required');
          dirty = true;
          return send(200, { success: true, medicament: med });
        }
        if (m === 'GET' && path === '/api/admin/users') {
          return send(200, { success: true, users: db.users.map((u) => ({ ...publicUser(u), annonce_count: db.annonces.filter((a) => a.user_id === u.id).length })) });
        }
        if (m === 'PATCH' && (match = path.match(/^\/api\/admin\/moderate\/(\d+)$/))) {
          const a = db.annonces.find((x) => x.id === Number(match[1]));
          if (!['PUBLIEE', 'REJETEE', 'SUSPENDUE'].includes(field('statut'))) return fail(400, 'Statut invalide.');
          if (!a) return fail(404, 'Annonce introuvable.');
          a.statut = field('statut');
          const o = db.ordonnances.find((x) => x.id === a.ordonnance_id && x.statut === 'EN_ATTENTE');
          const ordStatut = { PUBLIEE: 'VALIDEE', REJETEE: 'REJETEE' }[a.statut];
          if (o && ordStatut) o.statut = ordStatut;
          dirty = true;
          return send(200, { success: true, annonce: a });
        }
        if (m === 'PATCH' && (match = path.match(/^\/api\/admin\/users\/(\d+)\/suspend$/))) {
          const u = db.users.find((x) => x.id === Number(match[1]));
          if (!u) return fail(404, 'Utilisateur introuvable.');
          if (u.id === me.id) return fail(403, 'Vous ne pouvez pas suspendre votre propre compte.');
          u.is_suspended = !!field('suspend');
          dirty = true;
          return send(200, { success: true });
        }
        if (m === 'DELETE' && (match = path.match(/^\/api\/admin\/users\/(\d+)$/))) {
          const id = Number(match[1]);
          if (id === me.id) return fail(403, 'Vous ne pouvez pas supprimer votre propre compte.');
          db.users = db.users.filter((u) => u.id !== id);
          db.annonces = db.annonces.filter((a) => a.user_id !== id);
          dirty = true;
          return send(200, { success: true });
        }
      }

      return fail(404, `Route de démo inconnue : ${m} ${path}`);
    } catch (err) {
      console.error('[demo api]', err);
      return fail(500, 'Erreur du serveur de démo.');
    }
  }

  return {
    handle,
    reset() { db = createState(); save(db); },
  };
}
